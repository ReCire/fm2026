export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","manifest.webmanifest","service-worker.js"]),
	mimeTypes: {".png":"image/png",".webmanifest":"application/manifest+json"},
	_: {
		client: {start:"_app/immutable/entry/start.IUupcrJh.js",app:"_app/immutable/entry/app.D-TIt6tv.js",imports:["_app/immutable/entry/start.IUupcrJh.js","_app/immutable/chunks/Cb7MEA1N.js","_app/immutable/chunks/CIqInv64.js","_app/immutable/chunks/B68PDXIc.js","_app/immutable/entry/app.D-TIt6tv.js","_app/immutable/chunks/4nRBa-Rk.js","_app/immutable/chunks/Cb7MEA1N.js","_app/immutable/chunks/DNs61jeX.js","_app/immutable/chunks/B68PDXIc.js","_app/immutable/chunks/CqS7S7ny.js","_app/immutable/chunks/xwhPOwv5.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/3.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/[module]",
				pattern: /^\/([^/]+?)\/?$/,
				params: [{"name":"module","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set(["/"]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
