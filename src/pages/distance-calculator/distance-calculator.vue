<template>
	<view class="page-container">
		<!-- 搜索栏 -->
		<view class="search-bar">
			<view class="search-input-wrapper">
				<input 
					class="search-input" 
					type="text" 
					v-model="searchKeyword"
					placeholder="搜索地点..."
					@confirm="handleSearch"
					@input="handleSearchInput"
				/>
				<view class="search-btn" @click="handleSearch">
					<text class="icon">🔍</text>
				</view>
			</view>
			<!-- 图层切换 -->
			<view class="layer-switcher">
				<view 
					class="layer-btn" 
					:class="{ active: currentLayer === 'normal' }"
					@click="switchLayer('normal')"
				>
					<text>普通</text>
				</view>
				<view 
					class="layer-btn" 
					:class="{ active: currentLayer === 'satellite' }"
					@click="switchLayer('satellite')"
				>
					<text>卫星</text>
				</view>
				<view 
					class="layer-btn" 
					:class="{ active: currentLayer === 'terrain' }"
					@click="switchLayer('terrain')"
				>
					<text>地形</text>
				</view>
			</view>
		</view>

		<!-- 搜索结果列表 -->
		<view class="search-results" v-if="searchResults.length > 0">
			<view 
				class="search-result-item" 
				v-for="(item, index) in searchResults" 
				:key="index"
				@click="selectSearchResult(item)"
			>
				<text class="result-name">{{ item.display_name }}</text>
			</view>
		</view>

		<!-- 地图容器 -->
		<view id="map-container" class="map-container"></view>

		<!-- 控制按钮（左侧） -->
		<view class="control-buttons">
			<view 
				class="control-btn measure-btn" 
				:class="{ active: isMeasuring }"
				@click="toggleMeasureMode"
			>
				<text class="icon">📏</text>
				<text class="btn-text">{{ isMeasuring ? '测量中' : '测量' }}</text>
			</view>
			<view class="control-btn clear-btn" @click="clearMeasurement">
				<text class="icon">🗑️</text>
				<text class="btn-text">清除</text>
			</view>
		</view>

		<!-- 定位按钮（右下角） -->
		<view class="location-button" @click="locateCurrentPosition">
			<text class="icon">📍</text>
			<text class="btn-text">定位</text>
		</view>

		<!-- 结果面板 -->
		<view class="result-panel" :class="{ expanded: showResults }">
			<view class="result-header" @click="showResults = !showResults">
				<text class="result-title">📊 测量结果</text>
				<text class="toggle-icon">{{ showResults ? '▼' : '▲' }}</text>
			</view>
			<view class="result-content" v-if="showResults">
				<view class="result-row">
					<text class="result-label">📏 直线距离</text>
					<text class="result-value">{{ formatDistance(measureResult.distance) }}</text>
				</view>
				<view class="result-row">
					<text class="result-label">📐 实际距离</text>
					<text class="result-value">{{ formatDistance(measureResult.realDistance) }}</text>
				</view>
				<view class="result-divider"></view>
				<view class="result-row">
					<text class="result-label">⬆️ 起点海拔</text>
					<text class="result-value">{{ formatElevation(measureResult.startElevation) }}</text>
				</view>
				<view class="result-row">
					<text class="result-label">⬇️ 终点海拔</text>
					<text class="result-value">{{ formatElevation(measureResult.endElevation) }}</text>
				</view>
				<view class="result-divider"></view>
				<view class="result-row highlight">
					<text class="result-label">📊 落差</text>
					<text class="result-value" :class="measureResult.elevation > 0 ? 'positive' : 'negative'">
						{{ measureResult.elevation > 0 ? '+' : '' }}{{ formatElevation(measureResult.elevation) }}
					</text>
				</view>
				<view class="result-row">
					<text class="result-label">📈 坡度</text>
					<text class="result-value">{{ formatSlope(measureResult.slope) }}</text>
				</view>
			</view>
		</view>

		<!-- 提示信息 -->
		<view class="toast" v-if="toastMessage">
			<text>{{ toastMessage }}</text>
		</view>

		<!-- 加载中 -->
		<view class="loading-overlay" v-if="isLoading">
			<view class="loading-spinner"></view>
			<text class="loading-text">{{ loadingText }}</text>
		</view>
	</view>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { searchLocation, getElevation } from '@/api/api.js';

export default {
	data() {
		return {
			map: null,
			currentLayer: 'normal',
			layers: {},
			searchKeyword: '',
			searchResults: [],
			searchTimeout: null,
			
			isMeasuring: false,
			startMarker: null,
			endMarker: null,
			measureLine: null,
			locationMarker: null,
			
			measureResult: {
				distance: 0,
				realDistance: 0,
				startElevation: 0,
				endElevation: 0,
				elevation: 0,
				slope: 0
			},
			showResults: false,
			
			toastMessage: '',
			isLoading: false,
			loadingText: '加载中...',
			
			// 自定义图标
			startIcon: null,
			endIcon: null,
			locationIcon: null
		};
	},
	
	onReady() {
		this.initMap();
	},
	
	onUnload() {
		if (this.map) {
			this.map.remove();
		}
	},
	
	methods: {
		// 初始化地图
		initMap() {
			// 创建自定义图标
			this.createCustomIcons();
			
			// 初始化地图
			this.map = L.map('map-container', {
				center: [35.86, 104.19], // 中国中心
				zoom: 5,
				zoomControl: false
			});
			
			// 定义图层
			this.layers = {
				normal: L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}&key=de2187b7ea78c2bed8002aaf5e100229', {
					attribution: '© 高德地图',
					maxZoom: 18,
					subdomains: ['1', '2', '3', '4']
				}),
				satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
					attribution: '© Esri',
					maxZoom: 18
				}),
				terrain: L.tileLayer('/tiles/topo/{z}/{x}/{y}', {
					attribution: '© OpenTopoMap contributors',
					maxZoom: 17
				})
			};
			
			// 添加默认图层
			this.layers.normal.addTo(this.map);
			
			// 添加缩放控件到右下角
			L.control.zoom({ position: 'bottomright' }).addTo(this.map);
			
			// 绑定地图点击事件
			this.map.on('click', this.handleMapClick);
		},
		
		// 创建自定义图标
		createCustomIcons() {
			this.startIcon = L.divIcon({
				className: 'custom-marker start-marker',
				html: '<div class="marker-inner">A</div>',
				iconSize: [36, 36],
				iconAnchor: [18, 36]
			});
			
			this.endIcon = L.divIcon({
				className: 'custom-marker end-marker',
				html: '<div class="marker-inner">B</div>',
				iconSize: [36, 36],
				iconAnchor: [18, 36]
			});
			
			this.locationIcon = L.divIcon({
				className: 'custom-marker location-marker',
				html: '<div class="marker-inner">📍</div>',
				iconSize: [36, 36],
				iconAnchor: [18, 18]
			});
		},
		
		// 切换图层
		switchLayer(layerName) {
			if (this.currentLayer === layerName) return;
			
			// 移除当前图层
			this.map.removeLayer(this.layers[this.currentLayer]);
			
			// 添加新图层
			this.layers[layerName].addTo(this.map);
			this.currentLayer = layerName;
			
			this.showToast(`已切换到${layerName === 'normal' ? '普通' : layerName === 'satellite' ? '卫星' : '地形'}地图`);
		},
		
		// 定位当前位置
		locateCurrentPosition() {
			if (!navigator.geolocation) {
				this.showToast('您的浏览器不支持定位功能');
				return;
			}
			
			this.isLoading = true;
			this.loadingText = '正在获取位置...';
			
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const { latitude, longitude } = position.coords;
					
					// 移除旧的定位标记
					if (this.locationMarker) {
						this.map.removeLayer(this.locationMarker);
					}
					
					// 添加新的定位标记
					this.locationMarker = L.marker([latitude, longitude], {
						icon: this.locationIcon
					}).addTo(this.map);
					
					// 飞行到位置
					this.map.flyTo([latitude, longitude], 15, {
						duration: 1.5
					});
					
					this.isLoading = false;
					this.showToast('定位成功');
				},
				(error) => {
					this.isLoading = false;
					let message = '定位失败';
					switch (error.code) {
						case error.PERMISSION_DENIED:
							message = '用户拒绝了定位请求';
							break;
						case error.POSITION_UNAVAILABLE:
							message = '位置信息不可用';
							break;
						case error.TIMEOUT:
							message = '定位请求超时';
							break;
					}
					this.showToast(message);
				},
				{
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 0
				}
			);
		},
		
		// 搜索输入防抖
		handleSearchInput() {
			if (this.searchTimeout) {
				clearTimeout(this.searchTimeout);
			}
			
			if (!this.searchKeyword.trim()) {
				this.searchResults = [];
				return;
			}
			
			this.searchTimeout = setTimeout(() => {
				this.handleSearch();
			}, 500);
		},
		
		// 搜索地点
		async handleSearch() {
			if (!this.searchKeyword.trim()) {
				this.searchResults = [];
				return;
			}
			
			this.isLoading = true;
			this.loadingText = '搜索中...';
			
			try {
				const data = await searchLocation(this.searchKeyword);
				this.searchResults = data;
				
				if (data.length === 0) {
					this.showToast('未找到相关地点');
				}
			} catch (error) {
				console.error('搜索失败:', error);
				this.showToast('搜索失败，请稍后重试');
			} finally {
				this.isLoading = false;
			}
		},
		
		// 选择搜索结果
		selectSearchResult(item) {
			const lat = parseFloat(item.lat);
			const lng = parseFloat(item.lon);
			
			this.map.flyTo([lat, lng], 15, {
				duration: 1.5
			});
			
			this.searchResults = [];
			this.searchKeyword = item.display_name.split(',')[0];
		},
		
		// 切换测量模式
		toggleMeasureMode() {
			// 如果已有测量数据，先清除再进入测量模式
			if (this.startMarker || this.endMarker) {
				this.clearMeasurementSilent();
				this.isMeasuring = true;
				this.showToast('已清除上次测量，点击地图选择起点');
				return;
			}
			
			this.isMeasuring = !this.isMeasuring;
			
			if (this.isMeasuring) {
				this.showToast('点击地图选择起点');
			} else {
				this.showToast('已退出测量模式');
			}
		},
		
		// 处理地图点击
		handleMapClick(e) {
			// 如果不在测量模式，点击空白区域关闭结果面板
			if (!this.isMeasuring) {
				if (this.showResults) {
					this.showResults = false;
				}
				return;
			}
			
			const { lat, lng } = e.latlng;
			
			if (!this.startMarker) {
				// 设置起点
				this.startMarker = L.marker([lat, lng], {
					icon: this.startIcon,
					draggable: true
				}).addTo(this.map);
				
				this.startMarker.on('dragend', () => this.updateMeasurement());
				
				this.showToast('起点已设置，点击选择终点');
			} else if (!this.endMarker) {
				// 设置终点
				this.endMarker = L.marker([lat, lng], {
					icon: this.endIcon,
					draggable: true
				}).addTo(this.map);
				
				this.endMarker.on('dragend', () => this.updateMeasurement());
				
				// 绘制连线并计算
				this.updateMeasurement();
				this.showResults = true;
				this.isMeasuring = false;
			}
		},
		
		// 更新测量结果
		async updateMeasurement() {
			if (!this.startMarker || !this.endMarker) return;
			
			const startLatLng = this.startMarker.getLatLng();
			const endLatLng = this.endMarker.getLatLng();
			
			// 更新连线
			if (this.measureLine) {
				this.map.removeLayer(this.measureLine);
			}
			
			this.measureLine = L.polyline([
				[startLatLng.lat, startLatLng.lng],
				[endLatLng.lat, endLatLng.lng]
			], {
				color: '#667eea',
				weight: 4,
				opacity: 0.8,
				dashArray: '10, 5'
			}).addTo(this.map);
			
			// 计算水平距离
			const distance = this.calculateDistance(
				startLatLng.lat, startLatLng.lng,
				endLatLng.lat, endLatLng.lng
			);
			
			this.measureResult.distance = distance;
			
			// 获取海拔
			this.isLoading = true;
			this.loadingText = '获取海拔数据...';
			
			try {
				const [startElevation, endElevation] = await Promise.all([
					getElevation(startLatLng.lat, startLatLng.lng),
					getElevation(endLatLng.lat, endLatLng.lng)
				]);
				
				this.measureResult.startElevation = startElevation;
				this.measureResult.endElevation = endElevation;
				this.measureResult.elevation = endElevation - startElevation;
				
				// 计算实际距离（考虑高差）
				const elevationDiff = Math.abs(this.measureResult.elevation);
				this.measureResult.realDistance = Math.sqrt(
					distance * distance + elevationDiff * elevationDiff
				);
				
				// 计算坡度
				if (distance > 0) {
					this.measureResult.slope = (this.measureResult.elevation / distance) * 100;
				} else {
					this.measureResult.slope = 0;
				}
				
				// 更新连线颜色
				const isUphill = this.measureResult.elevation > 0;
				this.measureLine.setStyle({
					color: isUphill ? '#10b981' : '#ef4444'
				});
				
			} catch (error) {
				console.error('获取海拔失败:', error);
				this.showToast('获取海拔数据失败');
			} finally {
				this.isLoading = false;
			}
		},
		
		// 计算两点间距离（Haversine 公式）
		calculateDistance(lat1, lng1, lat2, lng2) {
			const R = 6371000; // 地球半径（米）
			const dLat = this.toRad(lat2 - lat1);
			const dLng = this.toRad(lng2 - lng1);
			const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
				Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
				Math.sin(dLng / 2) * Math.sin(dLng / 2);
			const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
			return R * c;
		},
		
		toRad(deg) {
			return deg * (Math.PI / 180);
		},
		

		
		// 清除测量
		clearMeasurement() {
			this.clearMeasurementSilent();
			this.showToast('已清除测量');
		},
		
		// 静默清除测量（不显示提示）
		clearMeasurementSilent() {
			if (this.startMarker) {
				this.map.removeLayer(this.startMarker);
				this.startMarker = null;
			}
			if (this.endMarker) {
				this.map.removeLayer(this.endMarker);
				this.endMarker = null;
			}
			if (this.measureLine) {
				this.map.removeLayer(this.measureLine);
				this.measureLine = null;
			}
			
			this.measureResult = {
				distance: 0,
				realDistance: 0,
				startElevation: 0,
				endElevation: 0,
				elevation: 0,
				slope: 0
			};
			
			this.showResults = false;
			this.isMeasuring = false;
		},
		
		// 格式化距离
		formatDistance(meters) {
			if (meters === 0) return '--';
			if (meters < 1000) {
				return `${meters.toFixed(1)} m`;
			}
			return `${(meters / 1000).toFixed(2)} km`;
		},
		
		// 格式化海拔
		formatElevation(meters) {
			if (meters === 0 && !this.startMarker) return '--';
			return `${meters.toFixed(1)} m`;
		},
		
		// 格式化坡度
		formatSlope(percent) {
			if (percent === 0 && !this.startMarker) return '--';
			return `${Math.abs(percent).toFixed(1)}%`;
		},
		
		// 显示提示
		showToast(message) {
			this.toastMessage = message;
			setTimeout(() => {
				this.toastMessage = '';
			}, 2000);
		}
	}
};
</script>

<style>
/* 全局样式 */
page {
	height: 100%;
	background: #1a1a2e;
}

.page-container {
	position: relative;
	width: 100%;
	height: 100vh;
	overflow: hidden;
}

/* 地图容器 */
.map-container {
	width: 100%;
	height: 100%;
}

/* 搜索栏 */
.search-bar {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	z-index: 1000;
	padding: 50rpx 30rpx 20rpx;
	background: linear-gradient(to bottom, rgba(26, 26, 46, 0.95), transparent);
	display: flex;
	gap: 20rpx;
}

.search-input-wrapper {
	flex: 1;
	display: flex;
	align-items: center;
	background: rgba(255, 255, 255, 0.15);
	backdrop-filter: blur(10px);
	border-radius: 50rpx;
	padding: 0 20rpx;
	border: 1px solid rgba(255, 255, 255, 0.2);
}

.search-input {
	flex: 1;
	height: 80rpx;
	color: #fff;
	font-size: 28rpx;
}

.search-input::placeholder {
	color: rgba(255, 255, 255, 0.5);
}

.search-btn {
	padding: 10rpx 20rpx;
}

.icon {
	font-size: 36rpx;
}

/* 图层切换 */
.layer-switcher {
	display: flex;
	background: rgba(255, 255, 255, 0.15);
	backdrop-filter: blur(10px);
	border-radius: 50rpx;
	overflow: hidden;
	border: 1px solid rgba(255, 255, 255, 0.2);
}

.layer-btn {
	padding: 20rpx 24rpx;
	color: rgba(255, 255, 255, 0.7);
	font-size: 24rpx;
	transition: all 0.3s;
}

.layer-btn.active {
	background: linear-gradient(135deg, #667eea, #764ba2);
	color: #fff;
}

/* 搜索结果 */
.search-results {
	position: absolute;
	top: 140rpx;
	left: 30rpx;
	right: 30rpx;
	z-index: 1000;
	background: rgba(26, 26, 46, 0.95);
	backdrop-filter: blur(10px);
	border-radius: 20rpx;
	max-height: 400rpx;
	overflow-y: auto;
	border: 1px solid rgba(255, 255, 255, 0.1);
}

.search-result-item {
	padding: 24rpx 30rpx;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.search-result-item:last-child {
	border-bottom: none;
}

.result-name {
	color: #fff;
	font-size: 26rpx;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

/* 控制按钮 */
.control-buttons {
	position: absolute;
	left: 30rpx;
	bottom: 400rpx;
	z-index: 1000;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

/* 定位按钮（右下角） */
.location-button {
	position: absolute;
	right: 30rpx;
	bottom: 400rpx;
	z-index: 1000;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100rpx;
	height: 100rpx;
	background: rgba(255, 255, 255, 0.15);
	backdrop-filter: blur(10px);
	border-radius: 50%;
	border: 1px solid rgba(255, 255, 255, 0.2);
	transition: all 0.3s;
}

.location-button:active {
	transform: scale(0.95);
	background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.control-btn {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100rpx;
	height: 100rpx;
	background: rgba(255, 255, 255, 0.15);
	backdrop-filter: blur(10px);
	border-radius: 50%;
	border: 1px solid rgba(255, 255, 255, 0.2);
	transition: all 0.3s;
}

.control-btn:active {
	transform: scale(0.95);
}

.control-btn.active {
	background: linear-gradient(135deg, #667eea, #764ba2);
}

.btn-text {
	color: #fff;
	font-size: 20rpx;
	margin-top: 4rpx;
}

/* 结果面板 */
.result-panel {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1000;
	background: linear-gradient(135deg, rgba(26, 26, 46, 0.98), rgba(30, 30, 60, 0.98));
	backdrop-filter: blur(20px);
	border-radius: 40rpx 40rpx 0 0;
	padding: 30rpx;
	transform: translateY(calc(100% - 100rpx));
	transition: transform 0.3s ease;
	border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.result-panel.expanded {
	transform: translateY(0);
}

.result-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-bottom: 20rpx;
}

.result-title {
	color: #fff;
	font-size: 32rpx;
	font-weight: 600;
}

.toggle-icon {
	color: rgba(255, 255, 255, 0.5);
	font-size: 24rpx;
}

.result-content {
	padding-top: 20rpx;
}

.result-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16rpx 0;
}

.result-row.highlight {
	background: rgba(255, 255, 255, 0.05);
	margin: 0 -20rpx;
	padding: 20rpx;
	border-radius: 16rpx;
}

.result-label {
	color: rgba(255, 255, 255, 0.7);
	font-size: 28rpx;
}

.result-value {
	color: #fff;
	font-size: 32rpx;
	font-weight: 600;
}

.result-value.positive {
	color: #10b981;
}

.result-value.negative {
	color: #ef4444;
}

.result-divider {
	height: 1px;
	background: rgba(255, 255, 255, 0.1);
	margin: 10rpx 0;
}

/* 提示信息 */
.toast {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 2000;
	background: rgba(0, 0, 0, 0.8);
	color: #fff;
	padding: 24rpx 48rpx;
	border-radius: 16rpx;
	font-size: 28rpx;
}

/* 加载中 */
.loading-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 3000;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.loading-spinner {
	width: 60rpx;
	height: 60rpx;
	border: 4rpx solid rgba(255, 255, 255, 0.3);
	border-top-color: #667eea;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.loading-text {
	color: #fff;
	font-size: 28rpx;
	margin-top: 20rpx;
}

/* 自定义标记样式 */
:deep(.custom-marker) {
	background: none;
	border: none;
}

:deep(.custom-marker .marker-inner) {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 16px;
	font-weight: bold;
	color: #fff;
	border-radius: 50% 50% 50% 0;
	transform: rotate(-45deg);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

:deep(.start-marker .marker-inner) {
	background: linear-gradient(135deg, #10b981, #059669);
}

:deep(.start-marker .marker-inner)::after {
	content: 'A';
	transform: rotate(45deg);
}

:deep(.end-marker .marker-inner) {
	background: linear-gradient(135deg, #ef4444, #dc2626);
}

:deep(.end-marker .marker-inner)::after {
	content: 'B';
	transform: rotate(45deg);
}

:deep(.location-marker .marker-inner) {
	background: linear-gradient(135deg, #3b82f6, #2563eb);
	border-radius: 50%;
	transform: none;
	animation: pulse 2s infinite;
}

@keyframes pulse {
	0% {
		box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
	}
	70% {
		box-shadow: 0 0 0 20px rgba(59, 130, 246, 0);
	}
	100% {
		box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
	}
}

/* Leaflet 控件样式覆盖 */
:deep(.leaflet-control-zoom) {
	border: none !important;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

:deep(.leaflet-control-zoom a) {
	background: rgba(26, 26, 46, 0.9) !important;
	color: #fff !important;
	border: none !important;
	backdrop-filter: blur(10px);
}

:deep(.leaflet-control-zoom a:hover) {
	background: rgba(102, 126, 234, 0.9) !important;
}
</style>
