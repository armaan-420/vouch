import {voteCounts} from './vouch-api.mjs';
import {productKey} from './account-records.mjs';

const profilesToKeep = new Map([
  ['v-7eb4ec35532b4e38', 'Armaan Nathani'],
  ['v-a09032c8280441af', 'Ria Sabnis'],
  ['v-da8a3872d158489e', 'Mallika Jain'],
  ['v-a5daec0c195f40fd', 'Nishant Chintala'],
]);

const pick = (rows, keep) => Object.fromEntries(
  Object.entries(rows || {}).filter(([key, row]) => keep(key, row)),
);
const yes = account => Object.values(account.opinions || {}).filter(row => row.verdict === 'yes').length;
const voteFields = ['baseVotes', 'communityVotes'];

function experimentCleanup(state, experimentId, records, keepKeys, keepBrowser) {
  const keepVote = (visitor, product) => {
    const owner = records.claims?.[JSON.stringify([experimentId, visitor, product])];
    return owner ? keepKeys.has(owner) : keepBrowser(visitor);
  };
  const countVotes = value => voteFields.reduce((count, field) =>
    count + Object.values(value[field] || {}).reduce((n, votes) => n + voteCounts(votes).total, 0), 0);
  const next = {...state};
  for (const phase of ['base', 'community']) {
    for (const suffix of ['Votes', 'VoteTimes', 'Comments']) {
      const field = phase + suffix;
      if (!state[field]) continue;
      next[field] = {};
      for (const [product, rows] of Object.entries(state[field])) {
        const retained = pick(rows, visitor => keepVote(visitor, product));
        if (Object.keys(retained).length) next[field][product] = retained;
      }
    }
  }
  next.visitors = pick(state.visitors, keepBrowser);
  next.sessions = pick(state.sessions, (_, session) => keepBrowser(session.visitorId));
  for (const [id, session] of Object.entries(next.sessions)) {
    if (session.answers) next.sessions[id] = {
      ...session,
      answers: pick(session.answers, product => keepVote(session.visitorId, product)),
    };
  }
  for (const field of ['nominations', 'nominationHistory']) {
    if (state[field]) next[field] = state[field].filter(row => keepBrowser(row.visitorId));
  }
  const nominationKeys = new Set([...(next.nominations || []), ...(next.nominationHistory || [])].map(row => row.key));
  next.reviews = pick(state.reviews, (key, review) => nominationKeys.has(key) ||
    Object.hasOwn(next.communityVotes || {}, 'community-' + (review.canonicalKey || key)));
  return {next, removedVotes: countVotes(state) - countVotes(next), remainingVotes: countVotes(next)};
}

export async function planLaunchCleanup(documents, hash) {
  const records = documents.get('accounts-v1');
  const auth = documents.get('account-auth-v1');
  if (!records || !auth) throw new Error('Account storage unavailable.');
  const accounts = pick(records.accounts, (_, account) =>
    !account.deletedAt && !account.disabledAt && profilesToKeep.has(account.handle) &&
    profilesToKeep.get(account.handle) === account.displayName);
  const keepKeys = new Set(Object.keys(accounts));
  if (keepKeys.size !== profilesToKeep.size ||
      new Set(Object.values(accounts).map(account => account.handle)).size !== profilesToKeep.size) {
    throw new Error('The four retained profiles could not be verified.');
  }
  const emailKeys = new Set();
  for (const [key, account] of Object.entries(auth.accounts)) {
    if (account.id && keepKeys.has(await hash(account.id))) emailKeys.add(key);
  }
  if (emailKeys.size !== keepKeys.size) throw new Error('The four retained sign-ins could not be verified.');

  const browsers = pick(records.browserOwners, (_, owner) => keepKeys.has(owner));
  for (const [key, account] of Object.entries(accounts)) {
    if (account.searchVisitor && !records.browserOwners?.[account.searchVisitor]) browsers[account.searchVisitor] = key;
  }
  const keepBrowser = visitor => Object.hasOwn(browsers, visitor);
  const refs = new Set(Object.values(accounts).flatMap(account => [account.handle, ...(account.tagVoterAliases || [])]));
  const keepTagVoter = voter => voter.startsWith('account:') ? refs.has(voter.slice(8)) : keepBrowser(voter);
  const oldAccounts = Object.entries(records.accounts).filter(([key]) => !keepKeys.has(key));
  const photosInUse = new Set(Object.values(accounts).map(account => account.photo));
  const photos = [...new Set(oldAccounts.map(([, account]) => account.photo)
    .filter(photo => typeof photo === 'string' && !photosInUse.has(photo)))];
  const productsInUse = new Set(Object.values(accounts).flatMap(account =>
    [...Object.keys(account.opinions || {}), ...(account.history || []).map(opinion => productKey(opinion.productId))]));
  const changes = new Map();
  changes.set('accounts-v1', {
    ...records,
    accounts,
    browserOwners: browsers,
    claims: pick(records.claims, (_, owner) => keepKeys.has(owner)),
    tickets: pick(records.tickets, (_, ticket) => keepBrowser(ticket.visitorId) &&
      (!ticket.usedBy || keepKeys.has(ticket.usedBy))),
    products: pick(records.products, key => productsInUse.has(key)),
  });

  const nextAuth = {...auth, accounts: pick(auth.accounts, key => emailKeys.has(key))};
  for (const field of ['sessions', 'challenges', 'verifications']) {
    if (auth[field]) nextAuth[field] = pick(auth[field], (_, row) => emailKeys.has(row.emailHash));
  }
  nextAuth.rates = pick(auth.rates, key => !key.startsWith('email:') || emailKeys.has(key.slice(6)));
  changes.set('account-auth-v1', nextAuth);

  let removedEditVotes = 0, retainedEditVotes = 0, removedTagSelections = 0, retainedTagSelections = 0;
  for (const [key, state] of documents) {
    if (key === 'experiment' || key.startsWith('experiment:')) {
      const id = key === 'experiment' ? 'sunscreen' : key.slice('experiment:'.length);
      const {next, removedVotes, remainingVotes} = experimentCleanup(state, id, records, keepKeys, keepBrowser);
      changes.set(key, next);
      removedEditVotes += removedVotes;
      retainedEditVotes += remainingVotes;
    }
    if (key === 'product-tag-votes') {
      const products = {};
      for (const [id, row] of Object.entries(state.products)) {
        const visitors = pick(row.visitors, keepTagVoter);
        const count = selections => Object.values(selections).reduce((n, tags) => n + tags.length, 0);
        const kept = count(visitors);
        retainedTagSelections += kept;
        removedTagSelections += count(row.visitors) - kept;
        if (Object.keys(visitors).length) products[id] = {...row, visitors};
      }
      changes.set(key, {...state, products});
    }
    if (key === 'pilot-events') {
      const events = state.events.filter(row => row.accountKey ? keepKeys.has(row.accountKey) : keepBrowser(row.visitorId))
        .map(row => row.ref && !refs.has(row.ref) ? Object.fromEntries(Object.entries(row).filter(([field]) => field !== 'ref')) : row);
      const rates = pick(state.rates, key => key.startsWith('a:') ? keepKeys.has(key.slice(2)) : keepBrowser(key.slice(2)));
      changes.set(key, {...state, events, rates});
    }
  }
  return {changes, photos, summary: {
    retainedProfiles: Object.values(accounts).map(account => ({name: account.displayName, vouches: yes(account)})),
    removedProfiles: oldAccounts.filter(([, account]) => !account.deletedAt).length,
    removedEmailRecords: Object.keys(auth.accounts).length - emailKeys.size,
    removedVouches: oldAccounts.reduce((n, [, account]) => n + yes(account), 0),
    removedEditVotes, retainedEditVotes, removedTagSelections, retainedTagSelections,
    removedProfilePhotos: photos.length,
  }};
}
