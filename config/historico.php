<?php

return [
    // Meses que o histórico de atividade se guarda; o comando historico:limpar apaga o que for mais antigo.
    'retencao_meses' => (int) env('HISTORICO_RETENCAO_MESES', 6),
];
