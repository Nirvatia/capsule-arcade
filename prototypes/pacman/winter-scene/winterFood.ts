import { lazy, makeTexture } from '../../../src/games/pacman/render/seasons/meadow/meadowSprites';

const TAU = Math.PI * 2;
const INK = '#241418';

export const winterSceneBauble = lazy(() =>
	makeTexture(26, 26, (c) => {
		c.translate(13, 13);
		c.lineJoin = 'round';
		c.beginPath();
		c.arc(0, -10.2, 1.9, 0, TAU);
		c.fillStyle = '#c8a03a';
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 1.2;
		c.stroke();
		c.beginPath();
		c.roundRect(-3, -9.1, 6, 3.4, 1.1);
		c.fillStyle = '#dfb64f';
		c.fill();
		c.stroke();
		const glass = c.createRadialGradient(-3.2, -3.5, 1, 0, 1.5, 10);
		glass.addColorStop(0, '#f05a50');
		glass.addColorStop(0.55, '#cf343c');
		glass.addColorStop(1, '#9f2634');
		c.beginPath();
		c.arc(0, 1.4, 9.5, 0, TAU);
		c.fillStyle = glass;
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 1.55;
		c.stroke();
		c.save();
		c.beginPath();
		c.arc(0, 1.4, 9.1, 0, TAU);
		c.clip();
		c.strokeStyle = '#f0c04a';
		c.lineWidth = 2.5;
		c.beginPath();
		c.moveTo(-9.4, 5.1);
		c.quadraticCurveTo(0, 1.4, 9.4, 5.1);
		c.stroke();
		c.strokeStyle = 'rgba(255,232,154,.55)';
		c.lineWidth = 0.65;
		c.beginPath();
		c.moveTo(-9.2, 4.2);
		c.quadraticCurveTo(0, 0.6, 9.2, 4.2);
		c.stroke();
		c.restore();
		c.fillStyle = 'rgba(255,255,255,.82)';
		c.beginPath();
		c.ellipse(-3.3, -2.5, 2.3, 1.5, -0.55, 0, TAU);
		c.fill();
		c.fillStyle = 'rgba(207,234,255,.72)';
		c.beginPath();
		c.arc(3, 5.2, 0.85, 0, TAU);
		c.fill();
	})
);
