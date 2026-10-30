import assert from 'node:assert/strict';
import test from 'node:test';
import { allocateOrderDiscountToLines } from '../src/lib/orderLinePricing.js';

test('allocates a percentage-like bill discount exactly across lines', () => {
  const lines = allocateOrderDiscountToLines(
    [
      { title: 'A', price: 99, qty: 1 },
      { title: 'B', price: 151, qty: 2 },
    ],
    4010,
    40100,
  );

  assert.equal(lines.reduce((sum, line) => sum + line.discount_allocated_paise, 0), 4010);
  assert.equal(lines.reduce((sum, line) => sum + line.line_total_after_discount_paise, 0), 36090);
  assert.equal(lines[0].originalLineTotal, 99);
  assert.equal(lines[1].originalLineTotal, 302);
});

test('uses stored line allocations for future order snapshots', () => {
  const lines = allocateOrderDiscountToLines(
    [
      {
        title: 'A',
        price: 100,
        qty: 1,
        line_subtotal_paise: 10000,
        discount_allocated_paise: 777,
      },
    ],
    1000,
    10000,
  );

  assert.equal(lines[0].discountAllocated, 7.77);
  assert.equal(lines[0].finalLineTotal, 92.23);
});
