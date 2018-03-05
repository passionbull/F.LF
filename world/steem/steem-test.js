
function getParameter(paramName) {
    var searchString = window.location.search.substring(1);
    var params = searchString.split('&');
    var i, val;

    for (i = 0; i < params.length; i++) {
        val = params[i].split('=');
        if (val[0] == paramName) {
            return val[1];
        }
    }
    return null;
}

function startSteemConnect()
{
    if (getParameter('access_token') !== null) {
        localStorage.setItem('access_token', getParameter('access_token'));
        localStorage.setItem('expires_in', getParameter('expires_in'));
        localStorage.setItem('auth_timestamp', Math.round(Date.now()/1000));
        localStorage.setItem('username', getParameter('username'));
        window.location.href = '//' + location.host + location.pathname;
    }

    var callbackURL = location.protocol + '//' + location.host + location.pathname;
    var accessToken = localStorage.getItem('access_token');
    var expiresIn = localStorage.getItem('expires_in');
    var authTimestamp = localStorage.getItem('auth_timestamp');
    var api;
    var logoutButton = document.querySelector('.logout');
    var loginButton = document.querySelector('.login');
    var currentTimestamp = Math.round(Date.now()/1000);

    console.log('Hello callbackURL : '+callbackURL);
    console.log('Hello authTimestamp : '+authTimestamp);


    if(currentTimestamp - authTimestamp >= expiresIn) {
            // 액세스토큰 유효기한 만료
            localStorage.removeItem('access_token');
            localStorage.removeItem('expires_in');
            localStorage.removeItem('username');
            localStorage.removeItem('auth_timestamp');

      api = sc2.Initialize({
        app: 'steemfighters',
        callbackURL: callbackURL,
        scope: ['vote', 'comment']
      });
      // 로그인 버튼 보이기
      logoutButton.style.display = 'none';
      loginButton.style.display = 'block';

      // 로그인 링크 설정
      var link = api.getLoginURL();
      loginButton.setAttribute('href', link);
    } 
    else 
    {
      // 액세스토큰 유효
      if (accessToken !== null) {
        // 이전에 저장된 액세스토큰이 있는 경우
        api = sc2.Initialize({
            app: 'steemfighters',
            callbackURL: callbackURL,
            accessToken: accessToken,
            scope: ['vote', 'comment']
        });
        // 로그아웃 버튼 보이기
        logoutButton.style.display = 'block';
        loginButton.style.display = 'none';

        // 로그아웃 클릭 처리
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();

            api.revokeToken(function (err, res) {
                console.log(err, res);
                localStorage.removeItem('access_token');
                localStorage.removeItem('expires_in');
                localStorage.removeItem('username');
                localStorage.removeItem('auth_timestamp');

                logoutButton.style.display = 'none';
                loginButton.style.display = 'block';
                var link = api.getLoginURL();
                loginButton.setAttribute('href', link);
            });
        });
      } else {
        // 이전에 로그인 한 적이 없어서 저장된 액세스토큰이 없는 경우
        api = sc2.Initialize({
            app: 'steemfighters',
            callbackURL: callbackURL,
            scope: ['vote', 'comment']
        });
        // 로그인 버튼 보이기
        logoutButton.style.display = 'none';
        loginButton.style.display = 'block';

        // 로그인 링크 설정
        var link = api.getLoginURL();
        console.log('SteemConnect2 getLoginURL:', link);
        loginButton.setAttribute('href', link);
      }
    }

    if (accessToken) {
      var username = localStorage.getItem('username');
      console.log('Login success, ', username);

      api.me(function (err, res) {
          console.log(err, res)
      });
      voteToSteemUser(api, 'millionfist');
      ///commentToSteem(api);
    }

}

function request_insert_user_db()
{
    var user ={name: 'jacobyu', email:'wnsl5684@gmail.com'};
    console.log(user);

    $.ajax(
    {   type: 'GET', 
        url : "http://127.0.0.1/get_user_info.php",
        data: user, dataType:"text",
        success : function(data, status, xhr) 
        { console.log('success '+data); },
        error: function(jqXHR, textStatus, errorThrown) 
        { 
            console.log('error '+jqXHR.responseText);
            console.log('error '+textStatus);
        } 
    });    
}

function getlatestPostonBlog(yourID)
{
    var url = ''
    steem.api.getBlogEntries(yourID, 9999, 10, function(err, data)
    { 
        
        console.log(err, data);
        for( i =0; i<data.length;i++)
        {
            if(data[i].author == yourID)
            {
                url = 'https://busy.org/@'+data[i].author+'/'+data[i].permlink
                console.log(url);
                break;
            }
        }
    });
    
}

function commentToSteem(api)
{
    var author = 'jacobyu';
    var parentPermlink = '4hudee';
    var permlink = 're-' + parentPermlink + '-' + Math.floor(Date.now() / 1000);
    var jsonMetadata =
    {
        "tags": ['test']
    };

    api.comment(author, parentPermlink, author, permlink, '', 'I wrote it using sc2.', jsonMetadata, function (err, res) {
      console.log(err, res)
    });
}

function voteToSteemUser(api, author)
{
    var voter = 'jacobyu';
    //var author = 'millionfist';
    var weight = 100;

    steem.api.getBlogEntries(author, 9999, 10, function(err, data)
    { 
        
        //console.log(err, data);
        for( i =0; i<data.length;i++)
        {
            if(data[i].author == author)
            {
                url = 'https://busy.org/@'+data[i].author+'/'+data[i].permlink
                console.log(url);
                
                api.vote(voter, author, data[i].permlink, weight, function (err, res) {
                  console.log(err, res)
                });

                break;
            }
        }
    });


}

//getlatestPostonBlog('jacobyu');
// api.vote(voter, author, permlink, weight, function (err, res) {
//   console.log(err, res)
// });

// api.comment(parentAuthor, parentPermlink, author, permlink, title, body, jsonMetadata, function (err, res) {
//   console.log(err, res)
// });

