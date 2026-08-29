import { redirect } from "next/navigation";

// A raiz não tem tela própria na Etapa 1: manda para a agenda.
// (o middleware já barra quem não está logado e redireciona para /login)
export default function Raiz() {
  redirect("/agenda");
}
