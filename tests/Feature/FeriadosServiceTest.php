<?php

use App\Services\FeriadosService;
use App\Support\LimiteFerias;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

const NAGER = 'date.nager.at/api/v3/PublicHolidays/*';

function respostaNager(): array
{
    $extra = ['04-19', '04-21', '05-01', '08-15', '10-05', '12-25'];

    return [
        ['date' => '2030-01-01', 'localName' => 'Ano Novo', 'global' => true, 'types' => ['Public']],
        ...array_map(fn ($d) => ['date' => "2030-$d", 'global' => true, 'types' => ['Public']], $extra),
        ['date' => '2030-03-05', 'localName' => 'Carnaval', 'global' => true, 'types' => ['Optional']],
        ['date' => '2030-06-10', 'localName' => 'Dia de Portugal', 'global' => true, 'types' => ['Public']],
        ['date' => '2030-06-24', 'localName' => 'Sao Joao', 'global' => false, 'types' => ['Public']],
        ['date' => '2030-07-01', 'localName' => 'Madeira', 'global' => false, 'types' => ['Public']],
    ];
}

beforeEach(fn () => Cache::flush());

it('usa a API e filtra Carnaval e feriados regionais', function () {
    Http::fake([NAGER => Http::response(respostaNager())]);

    expect(LimiteFerias::feriadosNacionais(2030))->toBe(['2030-01-01', '2030-04-19', '2030-04-21', '2030-05-01', '2030-08-15', '2030-10-05', '2030-12-25', '2030-06-10']);
});

it('guarda em cache e evita a 2.a chamada', function () {
    Http::fake([NAGER => Http::response(respostaNager())]);

    app(FeriadosService::class)->nacionais(2030);
    app(FeriadosService::class)->nacionais(2030);

    Http::assertSentCount(1);
});

it('recorre ao calculo local quando a API falha', function (string $modo) {
    Http::fake([NAGER => match ($modo) {
        'erro' => Http::response('', 500),
        'invalida' => Http::response('nao e json'),
        'vazia' => Http::response([]),
        'rede' => fn () => throw new ConnectionException('timeout'),
    }]);

    expect(LimiteFerias::feriadosNacionais(2030))->toBe(LimiteFerias::feriadosCalculados(2030))
        ->and(LimiteFerias::feriadosCalculados(2030))->toHaveCount(13);
})->with(['erro', 'invalida', 'vazia', 'rede']);

it('com falha recente nao volta a bater na API ate expirar a cache negativa', function () {
    Http::fake([NAGER => Http::sequence()->push('', 500)->push('', 500)->push(respostaNager())]);

    expect(app(FeriadosService::class)->nacionais(2030))->toBeNull();
    Http::assertSentCount(2); // 1.a chamada: 2 tentativas
    expect(app(FeriadosService::class)->nacionais(2030))->toBeNull();
    Http::assertSentCount(2);

    $this->travel(6)->minutes();
    expect(app(FeriadosService::class)->nacionais(2030))->toHaveCount(8);
});

it('resposta curta ou de outro ano nao e cacheada 30 dias', function (string $modo) {
    $corpo = $modo === 'curta'
        ? array_slice(respostaNager(), 0, 4)
        : array_map(fn ($f) => ['date' => str_replace('2030', '2031', $f['date'])] + $f, respostaNager());
    Http::fake([NAGER => Http::response($corpo)]);

    expect(app(FeriadosService::class)->nacionais(2030))->toBeNull()
        ->and(Cache::has('feriados.nager.pt.2030'))->toBeFalse();
})->with(['curta', 'outro-ano']);
