<template>
	<view class="page-container">
		<view class="header">
			<text class="header-title">🛠️ 工具箱</text>
			<text class="header-subtitle">实用小工具集合</text>
		</view>
		
		<view class="tools-grid">
			<view class="tool-card" @click="navigateTo('distance-calculator')">
				<view class="tool-icon">
					<text>🗺️</text>
				</view>
				<view class="tool-info">
					<text class="tool-name">距离落差计算</text>
					<text class="tool-desc">地图测量两点间距离和海拔差</text>
				</view>
				<view class="tool-arrow">
					<text>›</text>
				</view>
			</view>
			
			<!-- 更多工具可以在这里添加 -->
		</view>
		
		<view class="footer">
			<text class="footer-text">更多工具开发中...</text>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			title: '工具箱'
		}
	},
	methods: {
		navigateTo(page) {
			uni.navigateTo({
				url: `/pages/${page}/${page}`
			});
		}
	}
}
</script>

<style>
page {
	background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
	min-height: 100vh;
}

.page-container {
	padding: 40rpx 30rpx;
	min-height: 100vh;
}

.header {
	padding: 60rpx 0 40rpx;
	text-align: center;
}

.header-title {
	display: block;
	font-size: 56rpx;
	font-weight: 700;
	color: #fff;
	margin-bottom: 16rpx;
}

.header-subtitle {
	display: block;
	font-size: 28rpx;
	color: rgba(255, 255, 255, 0.6);
}

.tools-grid {
	padding: 20rpx 0;
}

.tool-card {
	display: flex;
	align-items: center;
	background: rgba(255, 255, 255, 0.08);
	backdrop-filter: blur(10px);
	border-radius: 24rpx;
	padding: 32rpx;
	margin-bottom: 24rpx;
	border: 1px solid rgba(255, 255, 255, 0.1);
	transition: all 0.3s ease;
}

.tool-card:active {
	transform: scale(0.98);
	background: rgba(255, 255, 255, 0.12);
}

.tool-icon {
	width: 100rpx;
	height: 100rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 24rpx;
	margin-right: 28rpx;
}

.tool-icon text {
	font-size: 48rpx;
}

.tool-info {
	flex: 1;
}

.tool-name {
	display: block;
	font-size: 32rpx;
	font-weight: 600;
	color: #fff;
	margin-bottom: 8rpx;
}

.tool-desc {
	display: block;
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.5);
}

.tool-arrow {
	color: rgba(255, 255, 255, 0.3);
	font-size: 48rpx;
	font-weight: 300;
}

.footer {
	padding: 60rpx 0;
	text-align: center;
}

.footer-text {
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.3);
}
</style>
