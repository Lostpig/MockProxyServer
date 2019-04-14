# MockProxyServer

一个简易可代理远程接口的本地文件http服务器

需要全局安装
```
npm i moproxy-server -g
```

使用
```
moproxy [remoteAddress] [options]
```
+ remoteAddress 远程服务器地址，包括端口；如未指定配置文件，则此参数为必须
+ 各类设置项

例:以下命令启动
```
moproxy 192.168.1.1:80 -p 8888
```
则以本地端口8888启动服务器，并代理转发请求至192.168.1.1:80

+ options 详细
> + -p  本地启动端口，不指定时默认使用8998
> + -l  不代理转发的本地文件路径，支持glob格式的路径匹配，多个路径之间用半角逗号分隔
>       默认为**/*.js, **/*.css, **/*.html；如有较复杂的匹配模式，建议使用配置文件
> + -d  本地文件相对根路径，默认为当前路径
> + --https  如远程服务器使用https，则需要配置该项
> + --cors   启用CORS跨域,启用后会在响应中添加相关http头
> + -v 或 --version  输出当前安装的mock-proxy-server版本号
> + -h 或 --help  输出帮助信息
> + -c 指定配置文件，必须为json格式文件；如指定了配置文件，则忽略包括remoteAddress在内的一切配置参数

+ 配置文件格式详细
```
{
  "remote": "192.168.1.1:80",     // 同remoteAddress参数
  "port": "8998",                 // 本地启动端口
  "directory": ".",               // 本地文件相对根路径
  "localFiles": [                 // 不代理转发的本地文件路径
    "**/*.js", 
    "**/*.css", 
    "**/*.html"
  ],
  "redirectPath": [               // 路径重定向路由，path支持glob格式的路径匹配
    { path: "/", file: "dist/index.html" },   // 将路径"/"路由至"dist/index.html"文件
    { path: "/app/**/*", file: "dist/app.html" }  // 将"/app"下的所有子路径都路由至"dist/app.html"文件
  ],
  "remoteHttps": false            // 如远程服务器使用https，则需配置为true
}
```


## changelog
### v0.1.16
+ 添加了延迟功能支持
> 使用lag参数，单位为毫秒

### v0.1.14
+ 添加了预处理机制的支持
> 需要使用`.js`格式的config文件,并使用preProcess配置项,preProcess为一个函数
> preProcess接收参数(url, result),并需要返回处理后的result
> url为当前请求路径字符串,result为一个{ statusCode, headers, content }
> statusCode 响应状态码
> headers 响应头
> content 响应体,如果是js,json,html就为String,否则为Buffer

### v0.1.13
+ 引入zlib，增加对gzip压缩流的支持

### v0.1.12
+ 修改了request请求方式，以支持https转发
+ 添加了js格式配置文件的支持

### v0.1.11
+ 添加cors支持,以及相关配置项

### v0.1.10
+ 修改log信息文本

### v0.1.9
+ 更名为 moproxy-server
+ cli命令修改为 moproxy

### v0.1.8
+ redirectPath 配置项添加了对glob模式的支持

### v0.1.7
+ 当使用配置文件时，不再必须使用remoteAddress参数

### v0.1.6
+ bug修复
