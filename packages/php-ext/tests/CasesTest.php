<?php

declare(strict_types=1);

namespace Polyspec\HttpNegotiation\Tests;

use PHPUnit\Framework\TestCase;
use Polyspec\HttpNegotiation\Accept as A;
use Polyspec\HttpNegotiation\Internal;

/**
 * The contract cases of http-negotiation run with the extension loaded (NG-1 to NG-12). HTTP_NEGOTIATION_CASES is the
 * path of contracts/negotiate.json, which make test-php sets. A text of the cases is latin1 (NG-1.4): its characters
 * U+0000 to U+00FF are the bytes of a PHP string; a name, a type and a subtype are a text, a UTF-8 string. A case of
 * the group internal arms its faults for the member, as a generated test does (binding G-5, NG-11.4), and a fault that
 * did not fire fails it.
 */
final class CasesTest extends TestCase
{
    /** @return array<string, list<array<string, mixed>>> */
    private static function cases(): array
    {
        $path = getenv('HTTP_NEGOTIATION_CASES');
        self::assertIsString($path);
        $cases = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        self::assertIsArray($cases);
        return $cases;
    }

    private static function latin1(string $text): string
    {
        return mb_convert_encoding($text, 'ISO-8859-1', 'UTF-8');
    }

    /** @param array<string, mixed> $case */
    private static function lines(array $case): array
    {
        return array_map(static fn (string $line): string => self::latin1($line), $case['lines']);
    }

    /** @return list<array<string, mixed>> */
    private static function ranges(A\Accept $accept): array
    {
        $ranges = [];
        foreach ($accept->ranges() as $range) {
            $parameters = [];
            foreach ($range->parameters as $parameter) {
                $parameters[] = ['name' => $parameter->name, 'value' => $parameter->value];
            }
            $ranges[] = ['type' => $range->type, 'subtype' => $range->subtype, 'parameters' => $parameters, 'weight' => $range->weight];
        }
        return $ranges;
    }

    /** @param list<array<string, mixed>> $ranges */
    private static function rangeBytes(array $ranges): array
    {
        return array_map(static fn (array $range): array => [
            'type' => $range['type'],
            'subtype' => $range['subtype'],
            'parameters' => array_map(
                static fn (array $p): array => ['name' => $p['name'], 'value' => self::latin1($p['value'])],
                $range['parameters'],
            ),
            'weight' => $range['weight'],
        ], $ranges);
    }

    /** @param list<A\Weight> $weights */
    private static function weights(array $weights): array
    {
        return array_map(static fn (A\Weight $w): array => ['weight' => $w->weight, 'range' => $w->range], $weights);
    }

    /** @param array<string, mixed> $value */
    private static function candidate(array $value): A\Candidate
    {
        return new A\Candidate(
            type: $value['type'],
            subtype: $value['subtype'],
            parameters: array_map(
                static fn (array $p): A\CandidateParameter => new A\CandidateParameter(
                    name: $p['name'],
                    values: array_map(static fn (string $v): string => self::latin1($v), $p['values']),
                ),
                $value['parameters'],
            ),
            matching: A\Matching::from($value['matching']),
            wildcards: $value['wildcards'],
        );
    }

    /** @param array<string, mixed> $case */
    private static function raises(array $case, callable $call): void
    {
        $raises = $case['raises'];
        try {
            $call();
            self::fail('no error: ' . $case['id']);
        } catch (\Throwable $error) {
            $class = 'Polyspec\\HttpNegotiation\\HttpNegotiation' . ucfirst($raises['category']) . 'Error';
            self::assertSame($class, $error::class, $case['id']);
            self::assertSame($raises['kind'], $error->kind(), $case['id']);
            self::assertSame($raises['status'], $error->status(), $case['id']);
            if ($raises['message'] !== null) {
                self::assertSame($raises['message'], $error->getMessage(), $case['id']);
            }
        }
    }

    /** @param array<string, mixed> $case */
    private static function check(array $case, callable $call, mixed $expected, callable $plain): void
    {
        if (isset($case['raises'])) {
            self::raises($case, $call);
        } else {
            self::assertSame($expected, $plain($call()), $case['id']);
        }
    }

    /**
     * @param array<string, mixed> $case
     * @return list<A\Weight>
     */
    private static function weigh(array $case): array
    {
        $accept = A\Accept::parse(self::lines($case));
        $candidates = array_map(static fn (array $c): A\Candidate => self::candidate($c), $case['candidates']);
        if (!isset($case['faults'])) {
            return $accept->weigh($candidates);
        }
        $armed = Internal\armFaults('accept.weigh', json_encode($case['faults'], JSON_THROW_ON_ERROR));
        try {
            return $accept->weigh($candidates);
        } finally {
            self::assertSame([], Internal\faultLeft($armed), $case['id']);
        }
    }

    public function testAccept(): void
    {
        $group = self::cases()['accept'];
        self::assertNotEmpty($group);
        foreach ($group as $case) {
            $call = static fn (): A\Accept => A\Accept::parse(self::lines($case));
            self::check($case, $call, isset($case['ranges']) ? self::rangeBytes($case['ranges']) : null, self::ranges(...));
        }
    }

    public function testWeigh(): void
    {
        $cases = self::cases();
        self::assertNotEmpty($cases['weigh']);
        self::assertNotEmpty($cases['internal']);
        foreach ([...$cases['weigh'], ...$cases['internal']] as $case) {
            self::check($case, static fn (): array => self::weigh($case), $case['weights'] ?? null, self::weights(...));
        }
    }

    /** NG-7.5: the invalid candidate alone and after a valid one fail the same way. */
    public function testInvalidCandidates(): void
    {
        $group = self::cases()['invalidCandidates'];
        self::assertNotEmpty($group);
        foreach ($group as $case) {
            $accept = A\Accept::parse(self::lines($case));
            $candidates = array_map(static fn (array $c): A\Candidate => self::candidate($c), $case['candidates']);
            foreach ([[$candidates[count($candidates) - 1]], $candidates] as $given) {
                self::check($case, static fn (): array => $accept->weigh($given), $case['weights'] ?? null, self::weights(...));
            }
        }
    }
}
