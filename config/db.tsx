import { drizzle } from 'drizzle-orm/neon-http';

const databaseUrl = process.env.DATABASE_URL;

export const db = databaseUrl
	? drizzle(databaseUrl)
	: (new Proxy(
			{},
			{
				get() {
					throw new Error('Missing DATABASE_URL environment variable');
				},
			}
		) as ReturnType<typeof drizzle>);
