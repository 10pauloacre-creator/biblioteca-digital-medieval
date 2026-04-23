/* nivel.js — Sistema de Níveis da Biblioteca Digital Medieval
   5 níveis baseados em pontuação acumulada nos quizzes.
   +1 ponto por acerto, -1 ponto por erro. */
(function () {
  'use strict';

  var NIVEIS = [
    null, // índice 0 não usado
    {
      id: 1,
      nome: 'Aprendiz',
      descricao: 'Iniciante nas artes do saber',
      estrelas: 1,
      pontosMin: 0,
      pontosMax: 49,
      bonusNota: 0,
      cor: '#a09878',
      corGlow: 'rgba(160,152,120,.5)',
      frameClass: 'frame-nivel-1'
    },
    {
      id: 2,
      nome: 'Camponês',
      descricao: 'Aprendiz dedicado dos pergaminhos',
      estrelas: 2,
      pontosMin: 50,
      pontosMax: 199,
      bonusNota: 1,
      cor: '#c9a84c',
      corGlow: 'rgba(201,168,76,.6)',
      frameClass: 'frame-nivel-2'
    },
    {
      id: 3,
      nome: 'Gladiador',
      descricao: 'Guerreiro do conhecimento arcano',
      estrelas: 3,
      pontosMin: 200,
      pontosMax: 299,
      bonusNota: 2,
      cor: '#4fc3f7',
      corGlow: 'rgba(79,195,247,.6)',
      frameClass: 'frame-nivel-3'
    },
    {
      id: 4,
      nome: 'Rei',
      descricao: 'Soberano dos domínios do saber',
      estrelas: 4,
      pontosMin: 300,
      pontosMax: 499,
      bonusNota: 6,
      cor: '#c084fc',
      corGlow: 'rgba(192,132,252,.6)',
      frameClass: 'frame-nivel-4'
    },
    {
      id: 5,
      nome: 'Mago Supremo',
      descricao: 'Domínio absoluto de todo o conhecimento',
      estrelas: 5,
      pontosMin: 500,
      pontosMax: null,
      bonusNota: 8,
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
