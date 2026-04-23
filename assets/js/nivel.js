/* nivel.js — Sistema de Níveis da Biblioteca Digital Medieval
   5 níveis baseados em pontuação acumulada nos quizzes.
   +1 ponto por acerto, -1 ponto por erro. */
(function () {
  'use strict';

  var NIVEIS = [
    null, // índice 0 não usado
    {
      id: 1,
      nome: 'Pergaminheiro das Runas',
      descricao: 'Iniciante nas artes do saber arcano',
      estrelas: 1,
      pontosMin: 0,
      pontosMax: 29,
      cor: '#a09878',
      corGlow: 'rgba(160,152,120,.5)',
      frameClass: 'frame-nivel-1'
    },
    {
      id: 2,
      nome: 'Escriba do Saber',
      descricao: 'Aprendiz dedicado dos manuscritos',
      estrelas: 2,
      pontosMin: 30,
      pontosMax: 79,
      cor: '#c9a84c',
      corGlow: 'rgba(201,168,76,.6)',
      frameClass: 'frame-nivel-2'
    },
    {
      id: 3,
      nome: 'Erudito Arcano',
      descricao: 'Mestre dos textos sagrados',
      estrelas: 3,
      pontosMin: 80,
      pontosMax: 149,
      cor: '#4fc3f7',
      corGlow: 'rgba(79,195,247,.6)',
      frameClass: 'frame-nivel-3'
    },
    {
      id: 4,
      nome: 'Guardião da Sabedoria',
      descricao: 'Protetor dos conhecimentos arcanos',
      estrelas: 4,
      pontosMin: 150,
      pontosMax: null, // sem limite fixo — suplantado pelo nível 5
      cor: '#c084fc',
      corGlow: 'rgba(192,132,252,.6)',
      frameClass: 'frame-nivel-4'
    },
    {
      id: 5,
      nome: 'Mago Supremo',
      descricao: 'Domínio absoluto de todo o conhecimento',
      estrelas: 5,
      pontosMin: null, // requer todos os quizzes + acurácia >= 95%
      pontosMax: null,
      cor: '#ff6a1a',
      corGlow: 'rgba(255,106,26,.7)',
      frameClass: 'frame-nivel-5'
    }
  ];

  window.BDM_NIVEIS = NIVEIS;

  window.getNivelInfo = function (nivel) {
    return NIVEIS[nivel] || NIVEIS[1];
  };

  window.getNivelStars = function (nivel) {
    var n = parseInt(nivel, 10) || 1;
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  };

  /* Retorna a % de progresso dentro do nível atual (0–100) */
  window.getNivelProgress = function (nivel, pontos) {
    var n = parseInt(nivel, 10) || 1;
    if (n >= 5) return 100;
    var info = NIVEIS[n];
    var next = NIVEIS[n + 1];
    if (!next || next.pontosMin == null) return 100;
    var range = next.pontosMin - info.pontosMin;
    var done  = pontos - info.pontosMin;
    return Math.max(0, Math.min(100, Math.round((done / range) * 100)));
  };

  /* Texto do próximo nível */
  window.getNivelProxTxt = function (nivel, pontos) {
    var n = parseInt(nivel, 10) || 1;
    if (n >= 5) return '⚜ NÍVEL MÁXIMO ⚜';
    var next = NIVEIS[n + 1];
    var falta = next.pontosMin - pontos;
    if (falta <= 0) return 'pronto para subir!';
    return falta + ' pts para ' + next.nome;
  };
}());
