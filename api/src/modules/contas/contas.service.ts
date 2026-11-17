import { hash, verify } from '@node-rs/argon2';
import type { User } from '@nutriscan/shared';

import type { RepositorioContas } from './contas.repository.js';

export type ServicoContas = {
  /** Cria a conta; 'email_em_uso' se o e-mail já tem conta. */
  cadastrar: (email: string, senha: string) => Promise<User | 'email_em_uso'>;
  /** O usuário, se e-mail e senha conferem; senão null (sem dizer qual dos dois errou). */
  entrar: (email: string, senha: string) => Promise<User | null>;
  buscar: (id: string) => Promise<User | null>;
  excluir: (id: string) => Promise<void>;
};

/** E-mail como é guardado: sem espaços nas pontas e em minúsculas. */
export const normalizarEmail = (email: string) => email.trim().toLowerCase();

export function criarServicoContas(
  contas: RepositorioContas,
  agora: () => Date = () => new Date(),
): ServicoContas {
  // Hash de uma senha qualquer: quando o e-mail não existe, a verificação roda mesmo assim, para
  // a resposta demorar o mesmo tempo (senão o tempo revelaria quais e-mails têm conta).
  const hashFicticio = hash('senha-que-ninguem-usa');

  return {
    async cadastrar(email, senha) {
      // argon2id com os parâmetros padrão da biblioteca (recomendação OWASP).
      const criado = await contas.criar(normalizarEmail(email), await hash(senha), agora());
      return criado ?? 'email_em_uso';
    },

    async entrar(email, senha) {
      const conta = await contas.buscarPorEmail(normalizarEmail(email));
      const confere = await verify(conta?.senhaHash ?? (await hashFicticio), senha);
      return conta && confere ? conta.usuario : null;
    },

    buscar: (id) => contas.buscarPorId(id),
    excluir: (id) => contas.excluir(id),
  };
}
