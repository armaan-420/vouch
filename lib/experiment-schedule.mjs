// Shared by the API and browser (served through public/schedule.js).
export function collectionStatus(experiment, now = Date.now()) {
  if (experiment.closed) return 'closed';
  if (experiment.startsAt && now < Date.parse(experiment.startsAt)) return 'upcoming';
  if (experiment.endsAt && now >= Date.parse(experiment.endsAt)) return 'ended';
  return 'open';
}

export function validateSchedule(data) {
  const result = {};
  for (const key of ['startsAt', 'endsAt']) {
    const value = data[key];
    if (value === null || value === '') { result[key] = null; continue; }
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
      throw Object.assign(Error('Enter valid start and end dates, including a time zone.'), {status:400});
    }
    result[key] = new Date(value).toISOString();
  }
  if (Boolean(result.startsAt) !== Boolean(result.endsAt) || result.endsAt && result.endsAt <= result.startsAt) {
    throw Object.assign(Error('Set both dates with the end after the start, or clear both dates.'), {status:400});
  }
  return result;
}
