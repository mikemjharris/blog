import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { originVerify, ORIGIN_VERIFY_HEADER } from '../security.ts';

const run = (secret: string | undefined, header?: string) => {
  const req = { get: (name: string) => (name === ORIGIN_VERIFY_HEADER ? header : undefined) } as Request;
  const result = { next: false, status: 0 };
  const res = {
    status(code: number) {
      result.status = code;
      return this;
    },
    type() {
      return this;
    },
    send() {
      return this;
    },
  } as unknown as Response;
  originVerify(secret)(req, res, () => {
    result.next = true;
  });
  return result;
};

describe('originVerify', () => {
  test('lets everything through when no secret is configured', () => {
    assert.deepEqual(run(undefined), { next: true, status: 0 });
    assert.deepEqual(run(''), { next: true, status: 0 });
  });

  test('passes requests carrying the secret', () => {
    assert.deepEqual(run('s3cret', 's3cret'), { next: true, status: 0 });
  });

  test('rejects requests without it or with the wrong value', () => {
    assert.deepEqual(run('s3cret'), { next: false, status: 403 });
    assert.deepEqual(run('s3cret', 'wrong!'), { next: false, status: 403 });
    assert.deepEqual(run('s3cret', 's3cre'), { next: false, status: 403 });
  });
});
