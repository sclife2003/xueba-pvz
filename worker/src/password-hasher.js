// Copyright (c) 2026. All rights reserved.

import { DurableObject } from 'cloudflare:workers';

import { hashPassword, verifyPassword } from './security.js';

export class PasswordHasher extends DurableObject {
    async hash(password) {
        if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
            throw new Error('Invalid password input');
        }
        return hashPassword(password, this.env.PASSWORD_PEPPER);
    }

    async verify(password, record) {
        if (typeof password !== 'string' || password.length < 10 || password.length > 128) return false;
        return verifyPassword(password, this.env.PASSWORD_PEPPER, record);
    }
}
