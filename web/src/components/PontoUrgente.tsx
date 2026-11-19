/** Bolinha amarela que marca um pedido urgente. */
export default function PontoUrgente() {
  return (
    <span
      role="img"
      aria-label="Pedido urgente"
      title="Pedido urgente"
      className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-yellow-400 align-middle"
    />
  );
}
