(function($)
{
	// This script was written by Steve Fenton
	// http://www.stevefenton.co.uk/Content/Jquery-Textarea-Expander/
	// Feel free to use this jQuery Plugin
	// Version: 3.0.2
    // Contributions by: 

	$.fn.inputexpander = function (settings) {
	
		var config = {
			classmodifier: "tae"
		};
		
		if (settings) {
			$.extend(config, settings);
		}
		
		function CheckContent(element) {
			if (element.clientHeight < element.scrollHeight){
				var $elem = $(element);
				//if(element.clientHeight < 500){//do not grow endlessly
				//element.clientHeight < element.scrollHeight
					var height = $elem.height() + 5;
					$elem.height(element.scrollHeight+5);
					CheckContent(element);
				//}else{
				//	$elem.style.overflow = "auto";
				//}
			}
		}

		return this.each(function () {
			$(this).addClass(config.classmodifier).css({ overflow: "hidden" });
			$(this).bind("keyup", function () {
				CheckContent(this);
			});			
		});
	};
})(jQuery);