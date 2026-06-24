#!/usr/bin/env node
/** 为 config.json 中选手补充登录账号（username/password） */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const configPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../data/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

for (let i = 0; i < config.players.length; i++) {
  const p = config.players[i];
  const num = i + 1;
  if (!p.username) p.username = `player${num}`;
  if (!p.password) p.password = `mp${String(num).padStart(2, '0')}`;
}

fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
console.log(`已为 ${config.players.length} 名选手生成账号`);
for (const p of config.players) {
  console.log(`  ${p.name} → ${p.username} / ${p.password}`);
}
