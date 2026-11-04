import { describe, expect, it } from "vitest";
import { operationError } from "@/lib/profile-service";

describe("errores del perfil", () => {
  it("traduce los topes de filas a mensajes amables", () => {
    expect(operationError({ code: "54000", message: "portfolio project limit reached" }, "guardar").message).toMatch(/50 proyectos/);
    expect(operationError({ code: "54000", message: "skill limit reached" }, "guardar").message).toMatch(/50 habilidades/);
    expect(operationError({ code: "54000", message: "portfolio media limit reached" }, "guardar").message).toMatch(/20 archivos/);
  });
  it("traduce la cuota por hora con el tiempo de espera", () => {
    const message = operationError({ code: "54000", message: "rate limit exceeded", hint: "Retry after 90 seconds." }, "guardar").message;
    expect(message).toMatch(/Espera 2 minutos/);
  });
  it("mantiene el mensaje de cuenta suspendida y los códigos anteriores", () => {
    expect(operationError({ code: "P0001", message: "account suspended" }, "guardar").message).toMatch(/suspendida/);
    expect(operationError({ code: "42501" }, "guardar").message).toMatch(/permiso/);
    expect(operationError({ code: "XX" }, "guardar los datos").message).toBe("No pudimos guardar los datos. Inténtalo de nuevo.");
  });
});
