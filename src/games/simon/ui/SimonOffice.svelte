<!-- Декоративный фон: ночной офис 1С-программиста. -->
<div class="office" aria-hidden="true">
	<div class="window">
		<div class="moon"></div>
		<div class="city">
			{#each [60, 85, 45, 95, 70, 55] as h, i (i)}
				<i style="height: {h}%"></i>
			{/each}
		</div>
	</div>

	<div class="clock"><i class="h"></i><i class="m"></i></div>

	<div class="poster"><b>1С</b>Предприятие<br />Мы всё проведём!</div>

	<div class="yellow sticky">дедлайн БЫЛ вчера</div>
	<div class="pink sticky">пароль: 123456</div>

	<div class="desk">
		<div class="mug"></div>
		<div class="papers"></div>
	</div>
</div>

<style>
	.office {
		position: absolute;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		pointer-events: none;
		background:
			repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.025) 0 2px, transparent 2px 90px),
			linear-gradient(180deg, #2b2154, #231a47 62%);
	}

	.window {
		position: absolute;
		left: 4%;
		top: 10%;
		width: min(20%, 240px);
		height: 34%;
		overflow: hidden;
		border: 8px solid #3d3170;
		border-radius: 6px;
		background: linear-gradient(180deg, #0c1640, #2a1d5e);
		box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.5);
	}

	.window::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 2;
		background:
			linear-gradient(90deg, transparent 49%, #3d3170 49% 51%, transparent 51%),
			linear-gradient(transparent 49%, #3d3170 49% 51%, transparent 51%);
	}

	.moon {
		position: absolute;
		right: 18%;
		top: 14%;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #fff3c4;
		box-shadow: 0 0 18px #fff3c4;
	}

	.city {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 60%;
		display: flex;
		align-items: flex-end;
		gap: 3px;
	}

	.city i {
		flex: 1;
		background: #120c2c radial-gradient(#ffd96b 1px, transparent 1.5px) 0 0 / 7px 9px;
	}

	.clock {
		position: absolute;
		right: 6%;
		top: 9%;
		width: 74px;
		height: 74px;
		border: 6px solid #1a1130;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 6px 0 rgba(0, 0, 0, 0.3);
	}

	.clock i {
		position: absolute;
		left: 50%;
		bottom: 50%;
		width: 4px;
		margin-left: -2px;
		border-radius: 2px;
		background: #1a1130;
		transform-origin: 50% 100%;
	}

	.clock .h {
		height: 18px;
		transform: rotate(-30deg);
	}

	.clock .m {
		height: 26px;
		animation: tick 60s steps(60) infinite;
	}

	.poster {
		position: absolute;
		right: 5%;
		top: 34%;
		width: 110px;
		padding: 8px;
		background: #fff3c4;
		color: #1a1130;
		font:
			700 13px/1.15 'Rubik',
			sans-serif;
		text-align: center;
		transform: rotate(3deg);
		box-shadow: 0 6px 0 rgba(0, 0, 0, 0.3);
	}

	.poster b {
		display: block;
		font:
			400 26px 'Russo One',
			sans-serif;
		color: #e8352b;
	}

	.sticky {
		position: absolute;
		width: 86px;
		padding: 8px;
		color: #1a1130;
		font:
			700 17px/1.05 'Caveat',
			cursive;
		box-shadow: 0 5px 0 rgba(0, 0, 0, 0.25);
	}

	.sticky.yellow {
		left: 6%;
		top: 52%;
		background: #ffe45c;
		transform: rotate(-6deg);
	}

	.sticky.pink {
		right: 18%;
		top: 13%;
		background: #ff9ec7;
		transform: rotate(5deg);
	}

	.desk {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 38%;
		border-top: 6px solid #6e4b31;
		background: linear-gradient(180deg, #5a3d28, #3a2718 30%, #2c1d12);
	}

	.mug {
		position: absolute;
		left: 7%;
		bottom: 40%;
		width: 46px;
		height: 50px;
		border: 4px solid #1a1130;
		border-radius: 0 0 10px 10px;
		background: #fff;
	}

	.mug::after {
		content: '';
		position: absolute;
		right: -18px;
		top: 8px;
		width: 14px;
		height: 20px;
		border: 4px solid #1a1130;
		border-left: 0;
		border-radius: 0 10px 10px 0;
	}

	.papers {
		position: absolute;
		right: 6%;
		bottom: 46%;
		width: 90px;
		height: 16px;
		border: 3px solid #1a1130;
		background: #fff;
		box-shadow:
			0 -8px 0 -3px #f1ecdf,
			0 -16px 0 -3px #fff;
		transform: rotate(-4deg);
	}

	@keyframes tick {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 900px) {
		.window,
		.poster,
		.sticky,
		.clock {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.clock .m {
			animation: none;
		}
	}
</style>
