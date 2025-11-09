/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx): Promise<Response> {
		try {
			const url = new URL(request.url);
			const pathSegments = url.pathname.split('/').filter(Boolean);
			
			// Check if the request is for a sitemap
			if (pathSegments[0] !== '.well-known') {
				return new Response('Not found', { status: 404 });
			}
			
			const type = pathSegments[1];
			const setOfWellKnownTypes = new Set(['security.txt', 'apple-app-site-association', 'assetlinks.json']);
			
			if (!setOfWellKnownTypes.has(type)) {
				return new Response('Not found', { status: 404 });
			}
				
			if (type === 'security.txt') {
				return new Response(securityTxt, {
					headers: {
						'Content-Type': 'text/plain',
					},
				});
			}

			if (type === 'apple-app-site-association') {
				return new Response(appleAppSiteAssociation, {
					headers: {
						'Content-Type': 'application/json',
					},
				});
			}

			if (type === 'assetlinks.json') {
				return new Response(assetLinks, {
					headers: {
						'Content-Type': 'application/json',
					},
				});
			}

			return new Response('Not found', { status: 404 });
		} catch (error) {
			console.error('Error handling request:', error);
			return new Response('Could not load XML', { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;

const securityTxt = `
Content-Type: text/plain

Contact: danny@antlerbrowser.com

Policy: https://antlerbrowser.com/privacy-policy
`

const appleAppSiteAssociation = JSON.stringify({
	"applinks": {
		"apps": [],
		"details": [
			{
				"appID": "4AF4P2U4ZF.com.antlerbrowser",
				"paths": ["*"]
			}
		]
	}
})


const assetLinks = JSON.stringify([
	{
		"relation": ["delegate_permission/common.handle_all_urls"],
		"target": {
			"namespace": "android_app",
			"package_name": "com.antlerbrowser",
			"sha256_cert_fingerprints": [
				"B3:0E:C5:14:78:56:AA:21:80:78:62:1D:0F:03:61:2A:FA:27:F9:48:E9:D8:29:3D:7B:4D:79:C3:97:EF:98:D7"
			]
		}
	}
])