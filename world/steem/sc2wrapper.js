function SC2wrapper()
{
    var user_name;
    var api;

    var callbackURL;
    var accessToken;
    var expiresIn;
    var authTimestamp;
    var logoutButton;
    var loginButton;
    var currentTimestamp;


    this.create = function()
    {
        if (this.getParameter('access_token') !== null) {
            localStorage.setItem('access_token', this.getParameter('access_token'));
            localStorage.setItem('expires_in', this.getParameter('expires_in'));
            localStorage.setItem('auth_timestamp', Math.round(Date.now()/1000));
            localStorage.setItem('username', this.getParameter('username'));
            window.location.href = '//' + location.host + location.pathname;
        }
        callbackURL = location.protocol + '//' + location.host + location.pathname;
        accessToken = localStorage.getItem('access_token');
        expiresIn = localStorage.getItem('expires_in');
        authTimestamp = localStorage.getItem('auth_timestamp');
        logoutButton = document.querySelector('.logout');
        loginButton = document.querySelector('.login');
        currentTimestamp = Math.round(Date.now()/1000);

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
    }
    this.getUser = function(){
        if (accessToken) 
        {
          username = localStorage.getItem('username');
          //console.log('Login success, ', username);

          api.me(function (err, res) {
              console.log('Login success');
              console.log(err, res);
              console.log(res.user);
              console.log(res.account.id);

              var userinfo ={name:res.user, id:res.account.id};

              $.ajax(
              {   type: 'GET', 
                  url : "http://45.76.217.116/F/F.LF/world/php/insert_user_info.php",
                  data: userinfo, dataType:"text",
                  success : function(data, status, xhr) 
                  { console.log('success add_user'); },
                  error: function(jqXHR, textStatus, errorThrown) 
                  { 
                      console.log('error '+jqXHR.responseText);
                      console.log('error '+textStatus);
                  } 
              }); 

          });
          ///voteToSteemUser(api, 'millionfist');
          ///commentToSteem(api);
        }        
    }
    this.updateDB = function(_opponent, isWin)
    {
      var userinfo;
      username = localStorage.getItem('username');
      userinfo = {name:username, win:isWin};
      $.ajax(
      {   type: 'GET', 
          url : "http://45.76.217.116/F/F.LF/world/php/update_user_info.php",
          data: userinfo, dataType:"text",
          success : function(data, status, xhr) 
          { console.log('success update_DB'); },
          error: function(jqXHR, textStatus, errorThrown) 
          { 
            console.log('error '+jqXHR.responseText);
            console.log('error '+textStatus);
          } 
      });

      var gameInfo = {user:username,opponent:_opponent, win:isWin};
      $.ajax(
      {   type: 'GET', 
          url : "http://45.76.217.116:3000/",
          data: gameInfo, dataType:"text",
          success : function(data, status, xhr) 
          { 
            //console.log('request comment'); 
        },
          error: function(jqXHR, textStatus, errorThrown) 
          { 
            //console.log('error '+jqXHR.responseText);
            //console.log('error '+textStatus);
          } 
      });


    }


    this.commentLatestPost = function(author, text)
    {
        var user = localStorage.getItem('username');
        //var author = 'millionfist';

        steem.api.getBlogEntries(author, 9999, 10, function(err, data)
        { 
            
            //console.log(err, data);
            for( i =0; i<data.length;i++)
            {
                if(data[i].author == author)
                {
                    var parentPermlink = data[i].permlink;
                    var permlink = 're-' + parentPermlink + '-' + Math.floor(Date.now() / 1000);
                    var jsonMetadata =
                    {
                        "tags": ['steemfighter']
                    };

                    api.comment(author, parentPermlink, user, permlink, '', text, jsonMetadata, function (err, res) {
                      console.log(err, res)
                    });

                    break;
                }
            }
        });
    }

    this.voteLatestPost = function(author, weight)
        {
        var user = localStorage.getItem('username');
        //var author = 'millionfist';

        steem.api.getBlogEntries(author, 9999, 10, function(err, data)
        { 
            
            //console.log(err, data);
            for( i =0; i<data.length;i++)
            {
                if(data[i].author == author)
                {
                    //url = 'https://busy.org/@'+data[i].author+'/'+data[i].permlink
                    //console.log(url);
                    
                    api.vote(user, author, data[i].permlink, weight, function (err, res) {
                      console.log(err, res)
                    });

                    break;
                }
            }
        });

    }

    this.getParameter = function(paramName)
    {
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
    this.create();
}



