package com.ivan.webproxy.servlet;

import java.io.IOException;
import java.util.Enumeration;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.ivan.webproxy.util.NetworkUtil;

public class ProxyRequest extends HttpServlet{

	private static final long serialVersionUID = -2801649926663432963L;

	@SuppressWarnings("unchecked")
	@Override
	protected void service(HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {
		String URL = request.getParameter("url");
		//Check whether it's from submited action.
		String action = request.getParameter("act");
		String host = request.getParameter("host");
		System.out.println("Action is:" + action + ", Host is:" + host);
		if(action != null && host != null){
			URL = host.endsWith("/") ? host : (host  + "/") + action + "?";
			Enumeration<String> params = request.getParameterNames();
			while(params.hasMoreElements()){
				String param =  params.nextElement();
				String value = request.getParameter(param);
				if(!isEmpty(value) && !"act".equals(param) && !"host".equals(param)){
					URL += param + "=" + value + "&";
				}
			}
		}
		String content = NetworkUtil.getURLContent(URL);
		
		request.getSession().setAttribute("content", content);
		response.sendRedirect("index.jsp");
	}
	
	private boolean isEmpty(String str){
		return null == str || "".equals(str);
	}

	
	
}
