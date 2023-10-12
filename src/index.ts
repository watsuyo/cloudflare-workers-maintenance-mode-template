export interface Env {
	YOUR_BUCKET_NAMESPACE: R2Bucket;
	YOUR_KV_NAMESPACE: KVNamespace;
}

const customResponse = (message = 'Under maintenance.') => {
	return new Response(message);
};

const isIPAddressInRanges = (ipAddress: string, ipRanges: string[]) => {
	const ipAddressBytes = ipAddress.split('.').map(Number);
	return ipRanges.some((ipRange) => {
		const [startIP, endIP] = ipRange.split('-');
		const startBytes = startIP.split('.').map(Number);
		const endBytes = endIP.split('.').map(Number);

		return (
			ipAddressBytes.slice(0, 3).every((byte, index) => byte === startBytes[index]) &&
			ipAddressBytes[3] >= startBytes[3] &&
			ipAddressBytes[3] <= endBytes[3]
		);
	});
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		try {
			const whiteList = await env.YOUR_KV_NAMESPACE.get('whiteList');
			const ipRanges = whiteList?.split(',');

			const clientIP = request.headers.get('CF-Connecting-IP');
			const isAllowed = clientIP && ipRanges ? isIPAddressInRanges(clientIP, ipRanges) : false;

			if (isAllowed) {
				return await fetch(request);
			} else {
				try {
					const object = await env.YOUR_BUCKET_NAMESPACE.get('index.html');
					if (object === null) {
						return customResponse();
					}
					return new Response(object.body);
				} catch (error) {
					console.error(error);
					return customResponse();
				}
			}
		} catch (error) {
			console.error(error);
			return customResponse();
		}
	},
};
