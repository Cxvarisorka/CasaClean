// Normalise a display name to a single, canonical casing so the same value
// can't be stored under different casings ("rOME"/"ROME" -> "Rome"). Capitalise
// the first letter, lowercase the rest. Callers guard against empty input
// before calling (every controller checks `!name` first), so name[0] is safe.
const formatName = (name) => name[0].toUpperCase() + name.slice(1).toLowerCase();

module.exports = formatName;
