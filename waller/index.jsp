<%@page contentType="text/html;charset=gb2312"%>
<html>
<head>
</head>
<body>
<div style="width:80%;height:80%" align="center">
	<div style="width:100%" align="center">
		<form action="/waller/waller.do" method="POST">
			<input type="input" name="url" style="width:800px;" />
			<input type="submit" value="Access"/>
		</form>
	</div>
	<%
	    Object result1 = request.getSession().getAttribute("content");
	    if(result1 != null){
	    	response.setCharacterEncoding("UTF-8");
			response.setContentType("text/html;charset=gb2312");
            out.write(result1.toString());
        }
	%>
</div>
</body>
</html>