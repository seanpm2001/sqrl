/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { RedisInterface, RateLimitOptions } from "../services/RedisService";
import invariant from "../jslib/invariant";
import { Context } from "../api/ctx";

export class MockRedisService implements RedisInterface {
  private db = {};

  async rateLimitFetch(
    ctx: Context,
    key: Buffer,
    opt: RateLimitOptions
  ): Promise<number> {
    const {
      maxAmount,
      // refillTimeMs,
      // refillAmount,
      take
      // at,
      // strict
    } = opt;

    const stringKey = key.toString("hex");
    if (!this.db.hasOwnProperty(stringKey)) {
      this.db[stringKey] = maxAmount;
    }
    const rv = this.db[stringKey];
    this.db[stringKey] = Math.max(0, this.db[stringKey] - take);
    return rv;
  }

  async increment(ctx: Context, bufferKey: Buffer) {
    const key = bufferKey.toString("hex");
    this.db[key] = this.db[key] || 0;
    this.db[key]++;
    return this.db[key];
  }
  async get(ctx: Context, bufferKey: Buffer) {
    const key = bufferKey.toString("hex");
    if (this.db.hasOwnProperty(key)) {
      return this.db[key];
    } else {
      return null;
    }
  }
  async del(ctx: Context, ...bufferKeys: Buffer[]): Promise<number> {
    let count = 0;
    for (const bufferKey of bufferKeys) {
      const key = bufferKey.toString("hex");
      if (this.db.hasOwnProperty(key)) {
        count += 1;
        delete this.db[key];
      }
    }
    return count;
  }
  async set(
    ctx: Context,
    bufferKey: Buffer,
    value: string,
    mode: null | "NX" | "XX"
  ) {
    const key = bufferKey.toString("hex");
    const exists = this.db.hasOwnProperty(key);
    if (mode === "XX" && !exists) {
      return false;
    } else if (mode === "NX" && exists) {
      return false;
    }

    this.db[key] = value;
    return true;
  }
  async getList(ctx: Context, bufferKey: Buffer): Promise<string[]> {
    const key = bufferKey.toString("hex");
    if (!this.db.hasOwnProperty(key)) {
      return [];
    }
    invariant(Array.isArray(this.db[key]), "Expected array in mock redis");
    return this.db[key];
  }
  async listPush(
    ctx: Context,
    bufferKey: Buffer,
    ...values: Array<string | Buffer | number>
  ): Promise<void> {
    const key = bufferKey.toString("hex");
    if (!this.db.hasOwnProperty(key)) {
      this.db[key] = [];
    }
    invariant(Array.isArray(this.db[key]), "Expected array in mock redis");
    this.db[key].push(
      ...values.map(value => {
        if (typeof value === "number") {
          return "" + value;
        } else if (value instanceof Buffer) {
          return value.toString("utf-8");
        } else {
          return value;
        }
      })
    );
  }
  async pfcount(ctx: Context, bufferKeys: Buffer[]): Promise<number> {
    const allKeys = bufferKeys.reduce(
      (accum, bufferKey) =>
        Object.assign({}, accum, this.db[bufferKey.toString("hex")] || {}),
      {}
    );
    return Object.keys(allKeys).length;
  }
  async pfadd(
    ctx: Context,
    bufferKey: Buffer,
    values: string[]
  ): Promise<void> {
    const key = bufferKey.toString("hex");
    this.db[key] = this.db[key] || {};
    for (const value of values) {
      this.db[key][value] = 1;
    }
  }
  async expire(
    ctx: Context,
    bufferKey: Buffer,
    seconds: number
  ): Promise<void> {
    // no-op in mock mode
  }
  async mgetNumbers(ctx: Context, bufferKeys: Buffer[]): Promise<number[]> {
    return bufferKeys.map(
      bufferKey => this.db[bufferKey.toString("hex")] || null
    );
  }
}
