import { Client } from 'pg';
import 'dotenv/config';

async function createDatabase() {
  // Extraction de l'URL du .env
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL manquant dans .env');
    process.exit(1);
  }

  // On se connecte à la base 'postgres' (base système) pour créer troxtworld
  const url = new URL(dbUrl);
  const targetDb = url.pathname.slice(1); // "troxtworld"
  url.pathname = '/postgres'; // base système par défaut

  const client = new Client({ connectionString: url.toString() });

  try {
    await client.connect();
    console.log('✅ Connecté au serveur PostgreSQL');

    // Vérifier si la base existe déjà
    const check = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDb]
    );

    if (check.rows.length === 0) {
      console.log(`📦 Création de la base "${targetDb}"...`);
      await client.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`✅ Base "${targetDb}" créée avec succès`);
    } else {
      console.log(`ℹ️  La base "${targetDb}" existe déjà`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n💡 Vérifie que PostgreSQL est démarré et que les credentials dans .env sont corrects.');
    console.log('   Host:', url.hostname, '| Port:', url.port, '| User:', url.username);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase();