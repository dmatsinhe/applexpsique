import bcrypt from "bcryptjs";
import { z } from "zod";
import { calculateAge, isAdult, MINIMUM_AGE } from "./age.js";
import { createAdultUser, findUserByEmail } from "./auth.repository.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "A password tem de ter pelo menos 8 caracteres"),
  // Data de nascimento completa (secção 5.1: "confirmação explícita de
  // idade, não apenas uma checkbox genérica"). Nunca persistida — só usada
  // para calcular e gravar isAdultVerified/ageVerifiedAt.
  birthDate: z.coerce.date(),
  locale: z.string().default("pt-PT"),
});

export class UnderageRegistrationError extends Error {
  constructor() {
    super(
      `Registo recusado: é necessário ter pelo menos ${MINIMUM_AGE} anos para usar esta aplicação.`,
    );
    this.name = "UnderageRegistrationError";
  }
}

export class AuthService {
  async register(input: unknown): Promise<{ userId: string }> {
    const parsed = registerSchema.parse(input);

    // Verificação de idade acontece ANTES de qualquer outra coisa, incluindo
    // antes de se saber se o email já está em uso — não há vantagem de
    // negócio em revelar mais que "não pode registar-se" a um menor.
    if (!isAdult(parsed.birthDate)) {
      throw new UnderageRegistrationError();
    }

    const existing = await findUserByEmail(parsed.email);
    if (existing) {
      throw new Error("Já existe uma conta com este email.");
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);

    // parsed.birthDate sai de scope aqui e nunca é passado ao repositório —
    // minimização de dados deliberada (ver docs/database-schema.md).
    const { id } = await createAdultUser({
      email: parsed.email,
      passwordHash,
      locale: parsed.locale,
    });

    return { userId: id };
  }

  async verifyCredentials(email: string, password: string): Promise<{ userId: string } | null> {
    const user = await findUserByEmail(email);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    return { userId: user.id };
  }
}

export { calculateAge };
