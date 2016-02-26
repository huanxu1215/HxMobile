require.config(requireConfig);
require([
	'zepto',
	'hxmobileapp'
],function($,hxmui){
	var init=0;
	$(function(){
		$('#gotoPage3').on('click',function(){
			hxmui.Router.goTo('#page3');
		});

		$('body').on('pageinit','#page3',function() {
			$('#initText').text('init成功' + (init++));
		});

		$('body').on('pageshow','#page3',function() {
			$('#showText').text('show回调执行' + (init++));
		});
		
		$('#btn_center').on('click',function(){
			hxmui.Popup.show({
                html: '<div style="height: 100px;text-align: center;font-size: 20px;font-weight: 600;margin-top: 10px;color:#E74C3C ">随意设计你的弹出框吧</div>',
                pos : 'center',
                clickMask2Close:true
            });
		});
		$('#btn_loading').on('click',function(){
			hxmui.Popup.loading();
		});
		$('#btn_toast').on('click',function(){
			hxmui.Toast.show('我是toast提示');
		});
	});
});