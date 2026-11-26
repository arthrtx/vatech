import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Junta classes e resolve conflitos de Tailwind, com a última a ganhar.
 *
 * Sem `twMerge`, `cn('px-4', 'px-6')` deixa as duas na string e quem ganha
 * passa a ser a ordem no CSS gerado — que ninguém controla no sítio da chamada.
 * É isto que faz a prop `className` de um componente ser fiável: quem consome
 * consegue mesmo sobrepor o que o componente traz.
 */
export function cn(...entradas: ClassValue[]) {
  return twMerge(clsx(entradas));
}
