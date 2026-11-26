import Link from "next/link";
import { erro as erroCls } from "@/components/ui";

export const metadata = { title: "Termos e Condições" };

const secoes: { titulo: string; texto: string[] }[] = [
  {
    titulo: "1. Âmbito",
    texto: [
      "Estes termos regulam a utilização da aplicação interna de gestão de férias e ausências da Setuptech. Ao criar uma conta ou usar a aplicação, aceita estes termos.",
    ],
  },
  {
    titulo: "2. Conta e credenciais",
    texto: [
      "A conta é pessoal e intransmissível. É responsável por manter a sua palavra-passe confidencial e por toda a atividade feita com a sua conta. Se suspeitar de uso indevido, altere a palavra-passe e avise a Setuptech.",
    ],
  },
  {
    titulo: "3. Dados pessoais tratados e finalidade",
    texto: [
      "Tratamos o seu nome, email, data de nascimento (se a indicar), os pedidos de férias, ausências e licenças que submeter e os anexos que juntar a esses pedidos.",
      "Estes dados servem para gerir e aprovar férias e ausências, mostrar a agenda da equipa e comunicar consigo sobre os seus pedidos. Não os usamos para outras finalidades.",
    ],
  },
  {
    titulo: "4. Os seus direitos (RGPD)",
    texto: [
      "Nos termos do Regulamento Geral sobre a Proteção de Dados, tem direito de acesso, retificação e apagamento dos seus dados, bem como de limitação do tratamento e de oposição. Para exercer estes direitos, use o contacto indicado abaixo. Pode também apresentar reclamação à autoridade de controlo (CNPD).",
    ],
  },
  {
    titulo: "5. Uso aceitável",
    texto: [
      "Use a aplicação apenas para os fins previstos. Não introduza informação falsa, não tente aceder a dados de outras pessoas e não procure contornar as medidas de segurança. Os anexos devem ser relevantes para o pedido a que se referem.",
    ],
  },
  {
    titulo: "6. Alterações aos termos",
    texto: [
      "Podemos atualizar estes termos. Quando a alteração for relevante, avisamos através da aplicação ou por email. Continuar a usar a aplicação depois do aviso significa que aceita a nova versão.",
    ],
  },
  {
    titulo: "7. Contacto",
    texto: ["TODO: contacto em falta"],
  },
];

export default function TermosPage() {
  return (
    <main className="flex min-h-screen justify-center bg-fundo p-4">
      <article className="flex w-full max-w-2xl flex-col gap-6 rounded-cartao bg-painel p-8 shadow-suave">
        <h1 className="text-2xl font-semibold">Termos e Condições</h1>
        <p role="note" className={erroCls}>
          Texto genérico, a rever antes de ser considerado definitivo.
        </p>
        {secoes.map((s) => (
          <section key={s.titulo} className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">{s.titulo}</h2>
            {s.texto.map((t) => (
              <p key={t} className="text-sm text-texto">
                {t}
              </p>
            ))}
          </section>
        ))}
        <Link href="/login" className="text-sm text-texto-suave underline underline-offset-2 hover:text-texto">
          Voltar ao login
        </Link>
      </article>
    </main>
  );
}
