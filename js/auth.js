// js/auth.js
// Cuida do formulário de login e do formulário de cadastro.

import {
  auth, db,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile,
  doc, setDoc, serverTimestamp
} from "./firebase.js";

function mostrarErro(texto) {
  const el = document.getElementById("mensagemErro");
  if (!el) return;
  el.textContent = texto;
  el.classList.add("visivel");
}

function limparErro() {
  document.getElementById("mensagemErro")?.classList.remove("visivel");
}

function traduzirErroFirebase(codigo) {
  const mapa = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-not-found": "Não encontramos uma conta com esse e-mail.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Já existe uma conta com esse e-mail.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/missing-password": "Digite sua senha."
  };
  return mapa[codigo] || "Ocorreu um erro. Tente novamente.";
}

/* ---------------- Formulário de login ---------------- */
const formLogin = document.getElementById("formLogin");
if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    limparErro();
    const botao = document.getElementById("btnEntrar");
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    botao.disabled = true;
    botao.textContent = "Entrando...";
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      window.location.href = "index.html";
    } catch (erro) {
      mostrarErro(traduzirErroFirebase(erro.code));
      botao.disabled = false;
      botao.textContent = "Entrar";
    }
  });
}

/* ---------------- Formulário de cadastro ---------------- */
const formCadastro = document.getElementById("formCadastro");
if (formCadastro) {
  formCadastro.addEventListener("submit", async (e) => {
    e.preventDefault();
    limparErro();
    const botao = document.getElementById("btnCadastrar");
    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const endereco = document.getElementById("endereco").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    botao.disabled = true;
    botao.textContent = "Criando conta...";
    try {
      const credencial = await createUserWithEmailAndPassword(auth, email, senha);
      await updateProfile(credencial.user, { displayName: nome });
      await setDoc(doc(db, "usuarios", credencial.user.uid), {
        nome, telefone, endereco, email,
        admin: false,
        criadoEm: serverTimestamp()
      });
      window.location.href = "index.html";
    } catch (erro) {
      mostrarErro(traduzirErroFirebase(erro.code));
      botao.disabled = false;
      botao.textContent = "Criar conta";
    }
  });
}
