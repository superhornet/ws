import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runner } from 'node-pg-migrate';
import { getPostgresConnectionConfig } from '../dist/js/libs/postgresConfig.js';

const [ direction, ...extraArgs ] = process.argv.slice( 2 );

if ( ( direction !== 'up' && direction !== 'down' ) || extraArgs.length > 0 ) {
    console.error( 'Usage: node scripts/migrate.mjs <up|down>' );
    process.exit( 1 );
}

if (
    direction === 'down' &&
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_PRODUCTION_MIGRATE_DOWN !== 'true'
) {
    console.error( 'Refusing migrate:down in production. Set ALLOW_PRODUCTION_MIGRATE_DOWN=true only for an intentional rollback.' );
    process.exit( 1 );
}

const migrationsDir = join( dirname( fileURLToPath( import.meta.url ) ), '..', 'migrations' );

try {
    const applied = await runner( {
        databaseUrl: getPostgresConnectionConfig(),
        dir: migrationsDir,
        direction,
        migrationsTable: 'pgmigrations',
        // Up applies everything pending; down rolls back a single step so a
        // mistaken invocation can't wipe the whole schema in one shot.
        count: direction === 'up' ? Infinity : 1,
    } );
    const names = applied.map( ( m ) => m.name );
    console.log(
        names.length
            ? `Applied ${direction} migration(s): ${names.join( ', ' )}`
            : `No ${direction} migrations to run.`,
    );
    process.exit( 0 );
} catch ( err ) {
    console.error( 'Migration failed:', err );
    process.exit( 1 );
}
