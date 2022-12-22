AUTHOR = 'Anastasiia Selezen'
SITENAME = 'Data Science Blog by Anastasiia Selezen'
SITEURL = ''

PATH = 'content'

TIMEZONE = 'Europe/Berlin'

DEFAULT_LANG = 'en'

# Feed generation is usually not desired when developing
FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None

# Blogroll
LINKS = (('Pelican', 'https://getpelican.com/'),
         ('Python.org', 'https://www.python.org/'),
         ('Jinja2', 'https://palletsprojects.com/p/jinja/'),
         ('You can modify those links in your config file', '#'),)

# Social widget
SOCIAL = (('My LinkedIn', 'http://www.linkedin.com/in/anastasiia-selezen'),
          ('Another social link', '#'),)

DEFAULT_PAGINATION = 10

MARKUP = ("md", "ipynb")

from pelican_jupyter import markup as nb_markup
PLUGINS = [nb_markup]
#PLUGIN_PATHS = ['./plugins']
IGNORE_FILES = [".ipynb_checkpoints"]

# Uncomment following line if you want document-relative URLs when developing
#RELATIVE_URLS = True