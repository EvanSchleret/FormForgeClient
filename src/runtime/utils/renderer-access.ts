export interface FormForgeRendererAccessGate {
  discover: () => Promise<boolean>
  verify: (code: string) => Promise<boolean>
  required: Readonly<{ value: boolean }>
}

export async function discoverFormForgeAccessAndLoadSchema(
  access: FormForgeRendererAccessGate,
  loadSchema: () => Promise<void>
): Promise<void> {
  const required = await access.discover()

  if (!required) {
    await loadSchema()
  }
}

export async function verifyFormForgeAccessAndLoadSchema(
  access: FormForgeRendererAccessGate,
  code: string,
  loadSchema: () => Promise<void>
): Promise<void> {
  if (await access.verify(code)) {
    await loadSchema()
  }
}
