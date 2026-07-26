import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/prisma.js";
import { AuthService, UnderageRegistrationError } from "./auth.service.js";
import { calculateAge, isAdult } from "./age.js";

const authService = new AuthService();
const createdEmails: string[] = [];

function futureUniqueEmail(prefix: string): string {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@lexpsique.pt`;
  createdEmails.push(email);
  return email;
}

function yearsAgo(years: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

describe("age.ts — cálculo de idade", () => {
  it("calcula 18 exatamente no dia do aniversário", () => {
    const birth = new Date("2008-07-26");
    const on = new Date("2026-07-26");
    expect(calculateAge(birth, on)).toBe(18);
    expect(isAdult(birth, on)).toBe(true);
  });

  it("ainda não é adulto um dia antes do 18º aniversário", () => {
    const birth = new Date("2008-07-26");
    const on = new Date("2026-07-25");
    expect(calculateAge(birth, on)).toBe(17);
    expect(isAdult(birth, on)).toBe(false);
  });
});

describe("AuthService.register — verificação de idade explícita (secção 5.1)", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    await prisma.$disconnect();
  });

  it("recusa o registo de um menor de 18 anos, sem criar conta", async () => {
    const email = futureUniqueEmail("menor");
    await expect(
      authService.register({
        email,
        password: "password123",
        birthDate: yearsAgo(16),
      }),
    ).rejects.toThrow(UnderageRegistrationError);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeNull();
  });

  it("regista um adulto e nunca persiste a data de nascimento", async () => {
    const email = futureUniqueEmail("adulto");
    const { userId } = await authService.register({
      email,
      password: "password123",
      birthDate: yearsAgo(30),
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.isAdultVerified).toBe(true);
    expect(user.ageVerifiedAt).not.toBeNull();
    expect("birthDate" in user).toBe(false);
  });

  it("rejeita password demasiado curta", async () => {
    const email = futureUniqueEmail("password-curta");
    await expect(
      authService.register({ email, password: "123", birthDate: yearsAgo(30) }),
    ).rejects.toThrow();
  });
});
