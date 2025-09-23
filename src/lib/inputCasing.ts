export function toUpperClean(s: string) {
  return (s ?? "").normalize().toUpperCase();
}
export function toLowerClean(s: string) {
  return (s ?? "").normalize().toLowerCase();
}
export const COUNTRY_LIST = [
  "Mexico","United States","Canada","Argentina","Brazil","Chile","Colombia","Costa Rica","Cuba","Dominican Republic","El Salvador","Guatemala","Honduras","Nicaragua","Panama","Peru","Uruguay","Venezuela",
  "United Kingdom","Ireland","France","Germany","Italy","Spain","Portugal","Netherlands","Belgium","Switzerland","Austria","Poland","Czech Republic","Hungary","Greece","Sweden","Norway","Denmark","Finland","Iceland",
  "Australia","New Zealand","China","Hong Kong","Japan","South Korea","Taiwan","Singapore","Malaysia","Philippines","Thailand","Indonesia","India","Pakistan","Bangladesh","Sri Lanka","Nepal","Vietnam","Cambodia","Laos",
  "Turkey","Israel","United Arab Emirates","Saudi Arabia","Qatar","Kuwait","Bahrain","Jordan","Lebanon","Egypt","South Africa","Kenya","Tanzania","Nigeria","Ghana","Ethiopia","Morocco","Tunisia","Algeria"
];
// "Mexico" will be the default selection in the UI.
