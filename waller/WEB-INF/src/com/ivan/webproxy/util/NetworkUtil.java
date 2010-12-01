package com.ivan.webproxy.util;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URL;

public class NetworkUtil {

	/**
	 * Passed in requested URL and return page content.
	 * @param url
	 * @return
	 */
	public static String getURLContent(String url){
		url = isProtocolWell(url);
		System.out.println("URL is:" + url);
		StringBuffer pageContent = new StringBuffer();
		
		//Access url and fetch the content. Assume url is not empty.
		BufferedReader reader = null;
		try {
			URL realURL = new URL(url);
			reader = new BufferedReader(new InputStreamReader(realURL.openStream()));
			String line = reader.readLine();
			while(line != null){
				pageContent.append(line);
				line = reader.readLine();
			}
			pageContent = extractURLsInPageContent(pageContent.toString());
			pageContent = extractActionInPageContent(pageContent.toString(), url);
		} catch (MalformedURLException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		} finally {
			try {
				if(reader != null){
					reader.close();
				}
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
		return pageContent.toString();
	}
	
	private static String isProtocolWell(String url){
		if(url.endsWith("&")){
			url = url.substring(0, url.length() - 1);
		}
		if(url.indexOf("http") == -1){
			return "http://" + url;
		}
		return url;
	}
	
	private static StringBuffer extractURLsInPageContent(String content){
		String tempContent = content.toString();
		int pos = tempContent.indexOf("href");
		while(pos != -1){
			int start = tempContent.indexOf("\"", pos) + 1;
			int end = tempContent.indexOf("\"", start);
			String origURL = tempContent.substring(start, end);
			if(origURL.indexOf("http") != -1){
				String newURL = "/waller/waller.do?url=" + origURL;
				content = content.replaceFirst(origURL, newURL);
			}
			pos = tempContent.indexOf("href", end);
		}
		return new StringBuffer(content);
	}
	
	private static StringBuffer extractActionInPageContent(String content, String host){
		String tempContent = content.toString();
		int pos = tempContent.indexOf("<form");
		while(pos != -1){
			int actStart = tempContent.indexOf("action=\"", pos) + 8;
			int actEnd = tempContent.indexOf("\"", actStart);
			String origAction = tempContent.substring(actStart, actEnd);
			String newAction = "/waller/waller.do?act=" + origAction + "&host=" + host;
			System.out.println(origAction + ", " + newAction);
			if(origAction.indexOf("POST") == -1){
				content = content.replaceFirst("action=\"" + origAction + "\"", "action=\"" + newAction + "\" method=\"POST\"");
			} else {
				content = content.replaceFirst("action=\"" + origAction + "\"", "action=\"" + newAction + "\"");
			}
			pos = tempContent.indexOf("<form", tempContent.indexOf(">", actStart));
		}
		return new StringBuffer(content);
	}
	
	
	public static void main(String[] args) {
		System.out.println(NetworkUtil.getURLContent("http://www.baidu.com?wd=tes"));
	}

}
