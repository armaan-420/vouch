// These paths belong to the app, so they cannot be experiment IDs.
export const RESERVED_EXPERIMENT_IDS=new Set(['admin','api','assets','images','signin-with-chatgpt','signout-with-chatgpt','auth','callback','index']);
export function isExperimentId(id){return typeof id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)&&id.length<=64&&!RESERVED_EXPERIMENT_IDS.has(id)}
export const experimentPath=id=>'/'+encodeURIComponent(id);
