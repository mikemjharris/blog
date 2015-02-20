
// document.getElementById('parent').onclick = function ( ) {

//   if ( this.className == 'clicked') {
//     this.className = '';
//   } else {
//     this.className = 'clicked';
//   }
// }
document.getElementById('parent2').onclick = function ( ) {

  // if ( this.className == 'test') {
  //   this.className = '';
  // } else {
  //   this.className = 'test';
  // }
}

$('.clicked ul li').click(function() {
  $('.clicked').removeClass('clicked');
  $('article').removeClass('show');
  $('.test').removeClass('test');
  $(this).addClass('test');
  $('.page').removeClass('showpage');
  var newPage = $(this).data('location');
   setTimeout(function() {
    $('article').addClass('show')
   
    $('.' + newPage).addClass('showpage');
  }, 0);
})