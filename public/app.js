(function() {
	angular
		.module('SimpleLoginApp',['ngRoute'])
		.config(['$routeProvider', '$locationProvider', config])
    	.run(['$rootScope', '$location', 'authentication', run])
		.service('authentication', authentication)
		.service('GetData', GetData)
		.controller('LoginController',LoginController)
		.controller('RegisterController',RegisterController)
		.controller('ProfileController',ProfileController);

		function config ($routeProvider, $locationProvider) {
	    $routeProvider
	      .when('/', {
	        templateUrl: 'home.html'
	      })
	      .when('/register', {
	        templateUrl: 'register.html',
	        controller: 'RegisterController',
	        controllerAs: 'auth'
	      })
	      .when('/login', {
	        templateUrl: 'login.html',
	        controller: 'LoginController',
	        controllerAs: 'auth'
	      })
	      .when('/profile', {
	        templateUrl: 'profile.html',
	        controller: 'ProfileController',
	        controllerAs: 'auth'
	      })
	      .otherwise({redirectTo: '/'});

	    // use the HTML5 History API
	    $locationProvider.html5Mode({
		  enabled: true,
		  requireBase: false
		});
	  }

	  function run($rootScope, $location, authentication) {
	    $rootScope.$on('$routeChangeStart', function(event, nextRoute, currentRoute) {
	      if ($location.path() === '/profile' && !authentication.isLoggedIn()) {
	        $location.path('/');
	      }
	    });
	  }

	  authentication.$inject = ['$http', '$window','$location'];

	  function authentication ($http, $window, $location) {
	    var saveToken = function (token) {
	      $window.localStorage['session-token'] = token;
	    };

	    var getToken = function () {
	      return $window.localStorage['session-token'];
	    };

	    var isLoggedIn = function() {
	      var token = getToken();
	      var payload;

	      if(token){
	        payload = token.split('.')[1];
	        payload = $window.atob(payload);
	        payload = JSON.parse(payload);

	        return payload.exp > Date.now() / 1000;
	      } 
	      else {
	        return false;
	      }
	    };

	    var currentUser = function() {
	      if(isLoggedIn()){
	        var token = getToken();
	        var payload = token.split('.')[1];
	        payload = $window.atob(payload);
	        payload = JSON.parse(payload);
	        return {
	          email : payload.email,
	          name : payload.name
	        };
	      }
	    };

	    register = function(user) {
	      return $http.post('/api/register/', user).then(function(data){
	        saveToken(data.data.token);
	      });
	    };

	    login = function(user) {
	      return $http.post('/api/login/', user)
	      					.then(
	      						function(data) {
						       		saveToken(data.data.token);
						    	},
						    	function(err_data) {
						       		if(err_data.status == 401)
						       		{
						       			alert("No user Found");
						       		}
						       		else
						       		{
						       			alert("Incorrect Password");
						       		}
						    	}
	      					);
	    };

	    logout = function() {
	      $window.localStorage.removeItem('session-token');
	      $location.path('/');
	    };

	    return {
	      currentUser : currentUser,
	      saveToken : saveToken,
	      getToken : getToken,
	      isLoggedIn : isLoggedIn,
	      register : register,
	      login : login,
	      logout : logout
	    };
	  }

	  GetData.$inject = ['$http', 'authentication'];

	  function GetData ($http, authentication) {
	    var getProfile = function () {
	      return $http.get('/api/profile/', {
	        headers: {
	          Authorization: 'Bearer '+ authentication.getToken()
	        }
	      });
	    };

	    return {
	      getProfile : getProfile
	    };
	  }

	  LoginController.$inject = ['$location', 'authentication']

	  function LoginController($location, authentication) {
	    var auth = this;

	    auth.credentials = {
	      username : "",
	      password : ""
	    };

	    auth.onSubmit = function () {
	      authentication
	        .login(auth.credentials)
	        .then(function(){
	          $location.path('/profile');
	        });
	    };
  	 }

  	 RegisterController.$inject = ['$location', 'authentication']

  	 function RegisterController($location, authentication) {
	    var auth = this;

	    auth.credentials = {
	      name : "",
	      username : "",
	      password : ""
	    };

	    auth.onSubmit = function () {
	      console.log('Submitting registration');
	      authentication
	        .register(auth.credentials)
	        .then(function(){
	          $location.path('/profile');
	        });
	    };
	 }

	 ProfileController.$inject = ['$location', 'GetData','authentication']

	  function ProfileController($location, GetData, authentication) {
	    var auth = this;
	    auth.user = {};

	    GetData.getProfile()
	      .then(function(data) {
	        auth.user = data.data;
	      });

	    auth.logout = function () {
	      authentication
	        .logout()
	    };
	}
})();
