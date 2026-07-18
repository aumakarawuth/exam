function dateKey(value) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function normalizeAcademicCalendar(value) {
  const years = Array.isArray(value) ? value : [];
  return years.map(year => {
    const academicYear = String(year?.academicYear || '').trim();
    const terms = (Array.isArray(year?.terms) ? year.terms : []).map(term => ({
      id: String(term?.id || '').trim(),
      label: String(term?.label || '').trim(),
      startsOn: dateKey(term?.startsOn),
      endsOn: dateKey(term?.endsOn)
    })).filter(term => term.id && term.label && term.startsOn && term.endsOn && term.startsOn <= term.endsOn);
    return { academicYear, terms };
  }).filter(year => year.academicYear && year.terms.length);
}

function resolveAcademicPeriod(settings, dateValue) {
  const date = dateKey(dateValue);
  if (!date) return null;
  for (const year of normalizeAcademicCalendar(settings?.academicCalendar)) {
    const term = year.terms.find(item => item.startsOn <= date && date <= item.endsOn);
    if (term) return { academicYear: year.academicYear, semester: term.id, semesterLabel: term.label };
  }
  return null;
}

function examStartDate(set) {
  const dates = [set?.availableFrom, ...(Array.isArray(set?.examSchedules) ? set.examSchedules.map(schedule => schedule?.availableFrom) : [])]
    .map(dateKey)
    .filter(Boolean)
    .sort();
  return dates[0] || '';
}

function applyAcademicPeriod(set, settings) {
  const period = resolveAcademicPeriod(settings, examStartDate(set));
  if (!period) return null;
  Object.assign(set, period);
  return period;
}

module.exports = { normalizeAcademicCalendar, resolveAcademicPeriod, applyAcademicPeriod };
