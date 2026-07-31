from DrissionPage import ChromiumPage, ChromiumOptions

co = ChromiumOptions().set_browser_path('/opt/brave-bin/brave')
page = ChromiumPage(co)
page.get('https://indiansignlanguage.org/hello/')
print("Success:", page.title)
page.quit()
