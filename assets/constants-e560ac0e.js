(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))r(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const n of t.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&r(n)}).observe(document,{childList:!0,subtree:!0});function s(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function r(e){if(e.ep)return;e.ep=!0;const t=s(e);fetch(e.href,t)}})();const a="WorkAdventure's journey began in 2020, openly sharing with the world.",c="In 2021, we started reshaping recruitment, onboarding, and training.",l="2022 saw our commitment to sustainability, GDPR compliance, and efficiency.",d="In 2023, we embraced Single Sign-On (SSO) and full customization.",u="2024 brings the promise of enhanced collaborations and gamification.",f="We did not place the objects on the ground, we are not savages :p",g="Nothing like a simple wooden table to highlight an object.",m="Don't be afraid of getting wet.",p="A sky full of colors...",E="Enough talking about us. Come on stage and introduce yourself!";export{f as C,a as S,c as a,l as b,d as c,u as d,g as e,m as f,p as g,E as h};