const MINIMUM_AGE = 18;

/**
 * Calcula a idade a partir de uma data de nascimento, sem margem de erro de
 * fuso horário simplista (usa apenas ano/mês/dia).
 */
export function calculateAge(birthDate: Date, onDate: Date = new Date()): number {
  let age = onDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = onDate.getMonth() - birthDate.getMonth();
  const dayDiff = onDate.getDate() - birthDate.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age;
}

export function isAdult(birthDate: Date, onDate: Date = new Date()): boolean {
  return calculateAge(birthDate, onDate) >= MINIMUM_AGE;
}

export { MINIMUM_AGE };
