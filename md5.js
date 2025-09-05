class MD5 {

	static hash(s) {

		const L = (x, c) =>
			(x << c) | (x >>> (32 - c));

		const C = (q, a, b, x, s, t) =>
			(b + L(
				(a + q + x + t) | 0,
				s
			)) | 0;

		const K = new Uint32Array(64);

		for(let i = 0; i < 64; i++)
			K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32);
		
		const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
		
		const b = new TextEncoder()
		.encode(s);
		const p = new Uint8Array(((b.length + 8) >>> 6 << 6) + 64);

		p.set(b);
		p[b.length] = 0x80;
		
		const dv = new DataView(p.buffer);

		dv.setUint32(
			p.length - 8,
			b.length * 8,
			true
		);
		dv.setUint32(
			p.length - 4,
			0,
			true
		);
		
		let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
		
		for(let i = 0; i < p.length; i += 64) {

			const chunkView = new DataView(
				p.buffer,
				i,
				64
			);
			const X = new Uint32Array(16);

			for(let j = 0; j < 16; j++)
				X[j] = chunkView.getUint32(
					j * 4,
					true
				);
			
			let [a, b1, c, d] = [a0, b0, c0, d0];
			let f, g;
			
			for(let j = 0; j < 64; j++) {

				if(j < 16) {

					f = (b1 & c) | (~b1 & d);
					g = j;
				
				}
				else if(j < 32) {

					f = (b1 & d) | (c & ~d);
					g = (5 * j + 1) % 16;
				
				}
				else if(j < 48) {

					f = b1 ^ c ^ d;
					g = (3 * j + 5) % 16;
				
				}
				else {

					f = c ^ (b1 | ~d);
					g = (7 * j) % 16;
				
				}
				
				const tmp = d;

				d = c;
				c = b1;
				b1 = C(
					f,
					a,
					b1,
					X[g],
					S[j],
					K[j]
				);
				a = tmp;
			
			}
			
			a0 = (a0 + a) | 0;
			b0 = (b0 + b1) | 0;
			c0 = (c0 + c) | 0;
			d0 = (d0 + d) | 0;
		
		}
		
		return [a0, b0, c0, d0].map(n =>
			("00000000" + ((((n >>> 24) & 0x000000ff) | ((n >>> 8) & 0x0000ff00) | ((n << 8) & 0x00ff0000) | ((n << 24) & 0xff000000)) >>> 0).toString(16)).slice(-8))
		.join("");
	
	}

}

export {
	MD5
};