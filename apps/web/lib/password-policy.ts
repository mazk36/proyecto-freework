/** Política de contraseña: solo longitud mínima, sin reglas de composición. Debe coincidir con GoTrue (minimum_password_length). */
export const MIN_PASSWORD_LENGTH = 10;

export const passwordRequirementText = `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
export const passwordTooShortMessage = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;

export function isPasswordLongEnough(password: string): boolean {
  return Array.from(password).length >= MIN_PASSWORD_LENGTH;
}
