由CMLIU项目修改
  https://github.com/cmliu/WorkerVless2sub
  https://github.com/cmliu/CF-Workers-SUB
  
  
环境变量

①
AUTH_TOKEN_ENV   //入口验证

  使用：域名/token
  
②
VLESS_NODES_ENV //节点信息格式为json

   格式:
       [
        "vless://",
        "trojan://",
        "vmess://"
        ]

        
 ③       
API_URL_ENV //优选ip链接 支持CMLIU的优选IP如https://addressesapi.090227.xyz/ct

  文本格式:
  
     ip:prot#注释
如果链接中只有IP则只替换IP，如果链接中有IP和端口则一起替换
workers链接可以直接作为订阅链接


