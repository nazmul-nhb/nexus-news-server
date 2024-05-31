import crypto from 'node:crypto';

const secret = crypto.randomBytes(64).toString('hex');
// can I use 128/256 bit?

console.log(secret);