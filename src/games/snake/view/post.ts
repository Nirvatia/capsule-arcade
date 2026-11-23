// WebGL2-пост поверх 2D-кадра: искажение пространства у порталов и туннель перехода
// между мирами. Без WebGL2 кадр выводится как есть.

export interface Warp {
	/** Центр в долях экрана. */
	x: number;
	y: number;
	/** Сила: > 0 — втягивает, < 0 — выталкивает. */
	a: number;
	/** Радиус в долях высоты. */
	r: number;
	dx: number;
	dy: number;
	/** Возраст 0..1 (для кольцевой волны). */
	age: number;
	/** 1 — изотропная рябь, 0 — растяжение вдоль направления. */
	iso: number;
}

export interface Tunnel {
	/** Центр в долях экрана. */
	x: number;
	y: number;
	zoom: number;
	/** Засветка 0..1 в момент смены поля. */
	flash: number;
	swirl: number;
}

const VS = `#version 300 es
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); gl_Position=vec4(p*2.0-1.0,0.0,1.0); }`;

const FS = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uRes; uniform float uTime;
uniform vec4 uW[4]; uniform vec4 uD[4]; uniform vec4 uTr; uniform float uSwirl; uniform vec3 uFlash;
out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
vec2 rot(vec2 v,float a){ float c=cos(a),s=sin(a); return vec2(c*v.x-s*v.y,s*v.x+c*v.y); }
void main(){
  vec2 uv=vec2(gl_FragCoord.x, uRes.y-gl_FragCoord.y)/uRes;
  float asp=uRes.x/uRes.y;
  vec2 c=uTr.xy; vec2 d=uv-c; d.x*=asp; float r0=length(d);
  d=rot(d,uSwirl*exp(-r0*2.2)); d/=uTr.z; d.x/=asp; uv=c+d;
  vec2 p=vec2(uv.x*asp,uv.y); vec2 chroma=vec2(0.0);
  for(int i=0;i<4;i++){
    float a=uW[i].z; if(abs(a)<0.001) continue;
    vec2 cc=vec2(uW[i].x*asp,uW[i].y); float R=uW[i].w; vec2 q=p-cc; float r=length(q)+1e-5;
    float g=exp(-(r*r)/(R*R)); vec2 dir=normalize(uD[i].xy); vec2 pe=vec2(-dir.y,dir.x);
    float u=dot(q,dir), v=dot(q,pe); float iso=uD[i].w;
    float su=1.0-0.8*a*g; float sv=mix(1.0+0.5*a*g, su, iso);
    u*=su; v*=sv;
    float age=uD[i].z; float rr=R*(1.0+age*1.3);
    float ring=sin((r-rr)*70.0)*exp(-pow((r-rr)/(R*0.55),2.0));
    p=cc+dir*u+pe*v+(q/r)*ring*0.01*a;
    chroma+=(q/r)*g*abs(a)*0.006;
  }
  uv=vec2(p.x/asp,p.y);
  chroma.x/=asp;
  vec3 col;
  col.r=textureLod(uTex,uv+chroma,0.0).r; col.g=textureLod(uTex,uv,0.0).g; col.b=textureLod(uTex,uv-chroma,0.0).b;
  // светлый акварельный мир: без bloom и тонмаппинга, только лёгкая виньетка
  float vg=smoothstep(1.25,0.4,length((uv-0.5)*vec2(asp,1.0)));
  col*=mix(0.9,1.0,vg);
  col=mix(col,uFlash,uTr.w);
  col+=(hash(gl_FragCoord.xy+fract(uTime)*91.7)-0.5)/255.0;
  o=vec4(col,1.0);
}`;

export class Post {
	private gl: WebGL2RenderingContext | null = null;
	private ctx2d: CanvasRenderingContext2D | null = null;
	private tex: WebGLTexture | null = null;
	private texW = 0;
	private texH = 0;
	private u: Record<string, WebGLUniformLocation | null> = {};

	constructor(private readonly view: HTMLCanvasElement) {
		const gl = view.getContext('webgl2', {
			antialias: false,
			alpha: false,
			preserveDrawingBuffer: false
		});
		if (gl && this.setup(gl)) this.gl = gl;
		else this.ctx2d = view.getContext('2d');
	}

	get webgl(): boolean {
		return this.gl !== null;
	}

	private setup(gl: WebGL2RenderingContext): boolean {
		const mk = (type: number, src: string): WebGLShader | null => {
			const sh = gl.createShader(type);
			if (!sh) return null;
			gl.shaderSource(sh, src);
			gl.compileShader(sh);
			if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
				console.warn('[Drift] shader failed', gl.getShaderInfoLog(sh));
				return null;
			}
			return sh;
		};
		const vs = mk(gl.VERTEX_SHADER, VS);
		const fs = mk(gl.FRAGMENT_SHADER, FS);
		const prog = gl.createProgram();
		if (!vs || !fs || !prog) return false;
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
		gl.useProgram(prog);
		gl.bindVertexArray(gl.createVertexArray());
		this.tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		for (const n of ['uTex', 'uRes', 'uTime', 'uW', 'uD', 'uTr', 'uSwirl', 'uFlash'])
			this.u[n] = gl.getUniformLocation(prog, n);
		return true;
	}

	resized(): void {
		this.texW = this.texH = 0;
	}

	present(
		scene: HTMLCanvasElement,
		time: number,
		warps: Warp[],
		tunnel: Tunnel | null,
		flash: [number, number, number]
	): void {
		const gl = this.gl;
		if (!gl) {
			this.ctx2d?.drawImage(scene, 0, 0);
			return;
		}
		gl.viewport(0, 0, this.view.width, this.view.height);
		gl.bindTexture(gl.TEXTURE_2D, this.tex);
		if (this.texW !== scene.width || this.texH !== scene.height) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
			this.texW = scene.width;
			this.texH = scene.height;
		} else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, scene);
		const ws = new Float32Array(16);
		const ds = new Float32Array(16);
		warps.slice(0, 4).forEach((w, i) => {
			ws.set([w.x, w.y, w.a, w.r], i * 4);
			const l = Math.hypot(w.dx, w.dy) || 1;
			ds.set([w.dx / l, w.dy / l, w.age, w.iso], i * 4);
		});
		for (let i = warps.length; i < 4; i++) ds.set([1, 0, 0, 0], i * 4);
		const tr = tunnel ?? { x: 0.5, y: 0.5, zoom: 1, flash: 0, swirl: 0 };
		gl.uniform1i(this.u.uTex, 0);
		gl.uniform2f(this.u.uRes, this.view.width, this.view.height);
		gl.uniform1f(this.u.uTime, time);
		gl.uniform4fv(this.u.uW, ws);
		gl.uniform4fv(this.u.uD, ds);
		gl.uniform4f(this.u.uTr, tr.x, tr.y, tr.zoom, tr.flash);
		gl.uniform1f(this.u.uSwirl, tr.swirl);
		gl.uniform3f(this.u.uFlash, flash[0], flash[1], flash[2]);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}
}
